struct GridLighting { sunDay:vec4f, params:vec4f }
struct Source { position:vec4f, power:vec4f }
@group(0) @binding(0) var<uniform> light:GridLighting;
@group(0) @binding(1) var materials:texture_3d<f32>;
@group(0) @binding(2) var<storage,read> sources:array<Source>;
@group(0) @binding(3) var directOut:texture_storage_3d<rgba16float,write>;
@group(0) @binding(4) var sunlightOut:texture_storage_3d<r32uint,write>;
@group(0) @binding(5) var directIn:texture_3d<f32>;
@group(0) @binding(6) var sunlightIn:texture_3d<u32>;
@group(0) @binding(7) var bounceOut:texture_storage_3d<rgba16float,write>;
@group(0) @binding(8) var previousBounce:texture_3d<f32>;
@group(0) @binding(9) var<uniform> reflectionOrder:vec4u;
@group(0) @binding(10) var<storage,read> areaColumns:array<u32>;
@group(0) @binding(11) var<uniform> areaSettings:vec4u;
fn areaActive(group:vec3u,level:u32,mist:bool)->bool{
  if(areaSettings.x==0u){return true;}
  let bits=(1u<<level)|select(0u,32u,mist);
  let row=select(group.z,group.y+((textureDimensions(materials).y+3u)/4u)*group.z,areaSettings.x==2u);
  return (areaColumns[group.x+areaSettings.y*row]&bits)!=0u;
}

struct Hit { cell:vec3i, normal:vec3i, distance:f32, status:u32 }
// Ray origin is always a cell centre in free space. status 0 means completed
// segment or grid exit, 1 means first opaque cell, and 2 is an unresolved budget.
// On boundary ties ordered single-axis steps conservatively include touching cells.
fn trace(cell:vec3i,dir:vec3f,radius:f32,dims:vec3i)->Hit {
  let step=vec3i(sign(dir));
  let stride=1./max(abs(dir),vec3f(.000001));
  var next=stride*.5;
  var at=cell;
  for(var i=0u;i<64u;i++){
    var axis=0u;
    if(next.y<next.x){axis=1u;}
    if(next.z<next[axis]){axis=2u;}
    let distance=next[axis];
    if(distance>radius){return Hit(at,vec3i(0),distance,0u);}
    at[axis]+=step[axis];
    if(any(at<vec3i(0))||any(at>=dims)){return Hit(at,vec3i(0),distance,0u);}
    if(textureLoad(materials,at,0).a>0.){
      var normal=vec3i(0);normal[axis]=-step[axis];
      return Hit(at,normal,distance,1u);
    }
    next[axis]+=stride[axis];
  }
  return Hit(at,vec3i(0),0.,2u);
}

@compute @workgroup_size(4,4,4)
fn inject(@builtin(global_invocation_id) global:vec3u,@builtin(workgroup_id) group:vec3u){
  let dims=vec3i(textureDimensions(materials));let cell=vec3i(global);
  if(any(cell>=dims)){return;}
  if(!areaActive(group,areaSettings.z,true)){
    textureStore(directOut,cell,vec4f(0));textureStore(sunlightOut,cell,vec4u(0));return;
  }
  if(textureLoad(materials,cell,0).a>0.){
    textureStore(directOut,cell,vec4f(0));textureStore(sunlightOut,cell,vec4u(0));return;
  }
  var visible=0u;
  if(light.sunDay.w>0.&&dot(light.sunDay.xyz,light.sunDay.xyz)>.001){
    let occluder=trace(cell,normalize(light.sunDay.xyz),1e5,dims);
    visible=select(0u,1u,occluder.status==0u);
  }
  textureStore(sunlightOut,cell,vec4u(visible,0,0,0));
  var direct=vec3f(0);
  if(light.params.y>0.){
    let width=i32(light.params.w);
    let bin=cell/width;let binDims=(dims+width-1)/width;
    let point=vec3f(cell)+.5;
    let pitch=light.params.z;
    let radius=f32(width)*pitch;
    for(var i=0u;i<27u;i++){
      let b=bin+vec3i(i32(i%3u)-1,i32((i/3u)%3u)-1,i32(i/9u)-1);
      if(any(b<vec3i(0))||any(b>=binDims)){continue;}
      let offset=u32(b.x+binDims.x*(b.y+binDims.y*b.z))*2u;
      for(var j=0u;j<2u;j++){
        let source=sources[offset+j];
        if(source.position.w==0.){continue;}
        let delta=source.position.xyz-point;let dist=length(delta);
        let r2=dot(delta,delta)*pitch*pitch;
        if(r2>=radius*radius){continue;}
        if(dist>.001){
          let hit=trace(cell,delta/dist,dist+.0001,dims);
          if(hit.status==2u||(hit.status==1u&&any(hit.cell!=vec3i(source.position.xyz)))){continue;}
        }
        let taper=1.-r2/(radius*radius);
        direct+=source.power.rgb*light.params.y*taper*taper/(.18+r2);
      }
    }
  }
  textureStore(directOut,cell,vec4f(direct,1.));
}

// A stratified set of paired directions includes axial rays for narrow corridors
// and oblique rays that cover both hemispheres. For every first hit the incident
// side is the previous open face. A blocked back face cannot borrow sunlight or
// emission computed on the other side of the wall.
const gatherDirs=array<vec3f,14>(
  vec3f(1,0,0),vec3f(-1,0,0),vec3f(0,1,0),vec3f(0,-1,0),vec3f(0,0,1),vec3f(0,0,-1),
  vec3f(.68,.61,.405),vec3f(-.68,-.61,-.405),vec3f(.405,.68,-.61),vec3f(-.405,-.68,.61),
  vec3f(.61,-.405,.68),vec3f(-.61,.405,-.68),vec3f(-.61,.68,.405),vec3f(.61,-.68,-.405)
);
@compute @workgroup_size(4,4,4)
fn reflectOnce(@builtin(global_invocation_id) global:vec3u,@builtin(workgroup_id) group:vec3u){
  let dims=vec3i(textureDimensions(materials));let cell=vec3i(global);
  if(any(cell>=dims)){return;}
  if(!areaActive(group,reflectionOrder.y,false)){textureStore(bounceOut,cell,vec4f(0));return;}
  if(textureLoad(materials,cell,0).a>0.){textureStore(bounceOut,cell,vec4f(0));return;}
  let pitch=light.params.z;let radius=min(7./pitch,32.);
  let sunColor=mix(vec3f(1.,.85,.64),vec3f(1.,.53,.28),light.params.x)*max(0.,light.sunDay.w);
  var reflected=vec3f(0);
  for(var i=0u;i<14u;i++){
    let hit=trace(cell,normalize(gatherDirs[i]),radius,dims);
    if(hit.status!=1u){continue;}
    let air=hit.cell+hit.normal;
    let albedo=textureLoad(materials,hit.cell,0).rgb;
    let sunlit=f32(textureLoad(sunlightIn,air,0).r)*max(0.,dot(vec3f(hit.normal),light.sunDay.xyz));
    var incident=sunColor*sunlit+textureLoad(directIn,air,0).rgb;
    // Previous input is cumulative. Reinject the original direct lighting once
    // per solve, yielding B1 + K(B1) + K²(B1) as the order increases.
    // The legacy first-bounce gain is 1.35. Higher orders use a bounded .8 gain.
    if(reflectionOrder.x>0u){incident+=textureLoad(previousBounce,air,0).rgb*(.8/1.35);}
    let fade=1.-hit.distance/radius;
    reflected+=albedo*incident*fade;
  }
  textureStore(bounceOut,cell,vec4f(reflected*(1.35/14.),1.));
}
