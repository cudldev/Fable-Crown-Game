struct Item {
  center:vec4f, extent:vec4f, origin:vec4f, shape:vec4f,
  tint:vec4f, extra:vec4f, atlas:vec4f, localMax:vec4f, pose:vec4f, band:vec4f,
}
struct Grid { originPitch:vec4f, counts:vec4u }
@group(0) @binding(0) var<uniform> grid:Grid;
@group(0) @binding(1) var<storage,read> actors:array<Item>;
@group(0) @binding(2) var castFields:texture_3d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
@group(0) @binding(4) var fixedMaterials:texture_3d<f32>;
@group(0) @binding(5) var composite:texture_storage_3d<rgba8unorm,write>;
// Binding 6 and the posed core/sleeve/boot functions come from town-actor.wgsl.
@group(0) @binding(7) var<storage,read> dirtyCells:array<u32>;
// Transport reads intrinsic albedo, independent of display-only sharpening.
struct PigmentStyle { style:vec4f }
const view=PigmentStyle(vec4f(0));
fn pigmentUV(uv:vec3f,dims:vec3f)->vec3f{return uv;}
fn pigmentWeight(w:vec3f,strength:f32)->vec3f{return w;}

fn unpackFieldAxes(encoded:f32)->vec3f{
  let packed=u32(encoded);
  return vec3f(vec3u(packed&255u,(packed>>8u)&255u,packed>>16u));
}
fn fieldSampleCounts(encoded:f32)->vec3f{
  if(encoded>=0.){return vec3f(encoded);}
  // Match the signed atlas count in the camera and shadow instance records.
  return unpackFieldAxes(-encoded);
}

fn actorSampleWorld(world:vec3f,obj:Item)->vec4f{
  if(obj.origin.w==9.){return rigCombined(world,obj);}
  let d=world-obj.origin.xyz;
  if(obj.origin.w==8.){
    let p=rigRotate(vec4f(-obj.pose.xyz,obj.pose.w),d);
    return vec4f(rigDistance(p,obj),obj.tint.rgb);
  }
  let p=vec3f(obj.shape.x*d.x-obj.shape.y*d.z,d.y,obj.shape.y*d.x+obj.shape.x*d.z)*obj.shape.z;
  if(any(p<obj.atlas.xyz)||any(p>obj.localMax.xyz)){return vec4f(1e6,0,0,0);}
  if(obj.origin.w==6.){
    let posed=townActorSample(p,obj,false);
    return vec4f(posed.x/obj.shape.z,posed.yzw*obj.tint.rgb);
  }
  let uv=(p-obj.atlas.xyz)/(obj.localMax.xyz-obj.atlas.xyz);
  let last=fieldSampleCounts(obj.atlas.w)-1.;
  var texel=uv*last;
  if(obj.atlas.w<0.&&obj.origin.w==3.&&obj.pose.x>=2.){
    texel=clamp(uv*(obj.pose.x-1.)-unpackFieldAxes(obj.pose.y),vec3f(0),last);
  }
  let location=(texel+.5+vec3f(obj.extra.xy,obj.localMax.w))/vec3f(textureDimensions(castFields));
  let value=textureSampleLevel(castFields,linearSampler,location,0.);
  return vec4f((value.r*2.-1.)*obj.shape.w/obj.shape.z,value.gba*obj.tint.rgb);
}

@compute @workgroup_size(64)
fn stampActors(@builtin(global_invocation_id) id:vec3u){
  if(id.x>=grid.counts.y){return;}
  let dims=textureDimensions(fixedMaterials);let index=dirtyCells[id.x];
  let cell=vec3i(vec3u(index%dims.x,(index/dims.x)%dims.y,index/(dims.x*dims.y)));
  var material=textureLoad(fixedMaterials,cell,0);
  if(material.a==0.){
    let pitch=grid.originPitch.w;let center=grid.originPitch.xyz+(vec3f(cell)+.5)*pitch;
    var best=0.;
    for(var i=0u;i<grid.counts.x;i++){
      let obj=actors[i];
      // Type 8 records are operands of the combined type 9 character recipe.
      // Sampling them separately would turn subtraction tools into solid matter.
      if(obj.origin.w==8.||obj.origin.w==10.){continue;}
      if(any(abs(center-obj.center.xyz)>obj.extent.xyz+vec3f(.25*pitch))){continue;}
      // Eight subcell centres plus the centre sample catch narrow limbs.
      // Each test uses the actual field; occupancy requires a negative distance.
      for(var j=0u;j<9u;j++){
        let bits=vec3u(j&1u,(j>>1u)&1u,(j>>2u)&1u);
        let offset=select((vec3f(bits)-.5)*(.5*pitch),vec3f(0),j==8u);
        let sample=actorSampleWorld(center+offset,obj);
        if(sample.x<best){best=sample.x;material=vec4f(sample.yzw,1);}
      }
    }
  }
  textureStore(composite,cell,material);
}
