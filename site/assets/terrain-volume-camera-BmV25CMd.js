const o=`
@group(1) @binding(11) var valleyVolumeSamples:texture_3d<u32>;
@group(1) @binding(12) var valleyVolumeRanges:texture_3d<u32>;

const valleyVolumeRate=vec3f(15.,7.5,15.);
const valleyVolumeZero=32767.5;
const valleyVolumeMiss=ValleyGroundHit(-1.,vec3f(0),0u);
const valleyVolumeFallback=ValleyGroundHit(-2.,vec3f(0),0u);

struct ValleyVolumeStep {
 hit:ValleyGroundHit,
 side:i32, // -1 solid, 0 unresolved at the initial clip, 1 empty.
}

fn valleyVolumeExit(o:vec3f,d:vec3f,origin:vec3f,cell:vec3i,width:i32)->f32{
 let edge=select(cell,min(cell+vec3i(width),vec3i(15)),d>vec3f(0));
 let moving=abs(d)>=vec3f(1e-10);
 let time=(origin+vec3f(edge)/valleyVolumeRate-o)/select(vec3f(1),d,moving);
 let crossing=select(vec3f(1e20),time,moving);
 return min(crossing.x,min(crossing.y,crossing.z));
}

struct ValleyVolumePlane {
 code:vec4f,
 rock:vec4f,
}

fn valleyVolumePlane(at:vec3i)->ValleyVolumePlane{
 let a=textureLoad(valleyVolumeSamples,at,0);
 let b=textureLoad(valleyVolumeSamples,at+vec3i(1,0,0),0);
 let c=textureLoad(valleyVolumeSamples,at+vec3i(0,0,1),0);
 let e=textureLoad(valleyVolumeSamples,at+vec3i(1,0,1),0);
 let code=vec4u(a.x,b.x,c.x,e.x)+(vec4u(a.y,b.y,c.y,e.y)<<vec4u(8u));
 return ValleyVolumePlane(vec4f(code)-valleyVolumeZero,vec4f(vec4u(a.z,b.z,c.z,e.z)));
}

fn valleyVolumeIntersect(o:vec3f,d:vec3f,origin:vec3f,atlas:vec3i,
 cell:vec3i,q:vec3f,t:f32,end:f32,incoming:i32,material:u32)->ValleyVolumeStep{
 let lo=valleyVolumePlane(atlas+cell);
 let hi=valleyVolumePlane(atlas+cell+vec3i(0,1,0));
 let h=lo.code;
 let slopes=hi.code-h;
 // The baker advances every corner by the same integer code per Y layer.
 // The mixed XY, YZ and XYZ coefficients of this trilinear voxel vanish.
 if(any(slopes!=vec4f(1028.))){return ValleyVolumeStep(valleyVolumeFallback,0);}
 let hx=h.y-h.x;
 let hz=h.z-h.x;
 let hxz=h.w-h.y-h.z+h.x;
 let local=q-vec3f(cell);
 let advance=d*valleyVolumeRate;
 let c=h.x+hx*local.x+hz*local.z+hxz*local.x*local.z+slopes.x*local.y;
 let b=hx*advance.x+hz*advance.z+hxz*(local.x*advance.z+local.z*advance.x)+slopes.x*advance.y;
 let a=hxz*advance.x*advance.z;
 let duration=end-t;
 let endpointValue=(a*duration+b)*duration+c;
 // A negative result immediately after a positive interval is a possible
 // terrain wall. Its ownership and normal are resolved by the exact path.
 if(c<-.016&&incoming==1){return ValleyVolumeStep(valleyVolumeFallback,0);}
 var root=valleySculptRoot(a,b,c,duration);
 if(root<1e19&&b+2.*a*root>0.){
  let back=valleySculptRoot(a,-b-2.*a*duration,endpointValue,duration);
  root=1e20;
  if(back<1e19&&b+2.*a*(duration-back)<0.){root=duration-back;}
 }
 if(root<1e19){
  let time=t+root;
  if(abs((a*root+b)*root+c)>.08){return ValleyVolumeStep(valleyVolumeFallback,0);}
  let hit=o+d*time;
  let uv=hit.xz-origin.xz;
  // The analytic wall/cut solver owns ties across different tile records.
  if(any(uv<vec2f(.00006))||any(uv>vec2f(.99994))){
   return ValleyVolumeStep(valleyVolumeFallback,0);
  }
  let hitCell=valleySculptCell(uv,d.xz,15.);
  var nodes=lo;
  if(any(hitCell!=cell.xz)){
   nodes=valleyVolumePlane(atlas+vec3i(hitCell.x,cell.y,hitCell.y));
  }
  let f=nodes.code;
  let xy=uv*15.-vec2f(hitCell);
  let gradient=vec3f(15.*mix(f.y-f.x,f.w-f.z,xy.y),7.5*slopes.x,
                     15.*mix(f.z-f.x,f.w-f.y,xy.x));
  let rock=valleySculptMix(nodes.rock,xy);
  let paint=select(material,34u,material==32u&&rock>=127.5);
  return ValleyVolumeStep(ValleyGroundHit(time,normalize(gradient),paint),0);
 }
 // A poorly conditioned root near an interval face can round out of the
 // interval even though its far endpoint already lies inside the solid.
 if((c>=0.||incoming==1)&&endpointValue<-.016){return ValleyVolumeStep(valleyVolumeFallback,0);}
 let side=select(-1,1,endpointValue>0.);
 return ValleyVolumeStep(valleyVolumeMiss,side);
}

fn valleyVolumeTraceTile(o:vec3f,d:vec3f,origin:vec3f,layer:u32,
 entry:f32,exit:f32,incoming:i32,material:u32)->ValleyVolumeStep{
 let atlasTile=vec3i(i32(layer%16u),0,i32(layer/16u));
 let atlas=atlasTile*16;
 var start=entry;
 var stop=exit;
 var side=incoming;
 let yMin=origin.y;
 let yMax=yMin+2.;
 let yStart=o.y+d.y*start;
 let yEnd=o.y+d.y*stop;
 if(min(yStart,yEnd)>yMax){return ValleyVolumeStep(valleyVolumeMiss,1);}
 if(max(yStart,yEnd)<yMin){
  if(side==1){return ValleyVolumeStep(valleyVolumeFallback,0);}
  return ValleyVolumeStep(valleyVolumeMiss,-1);
 }
 if(abs(d.y)>=1e-10){
  let y0=(yMin-o.y)/d.y;
  let y1=(yMax-o.y)/d.y;
  start=max(start,min(y0,y1));
  stop=min(stop,max(y0,y1));
  if(start>entry){
   // The endpoints of a template's Y slab have uniform signs.
   if(d.y>0.&&side==1){return ValleyVolumeStep(valleyVolumeFallback,0);}
   side=select(1,-1,d.y>0.);
  }
 }
 if(start>=stop){return ValleyVolumeStep(valleyVolumeFallback,0);}
 var t=start;
 var mixedUntil=vec3f(-1.);
 // A line segment crosses at most 45 cells in this 15^3 volume.
 for(var step=0u;step<48u;step++){
  let q=(o+d*t-origin)*valleyVolumeRate;
  if(any(q<vec3f(-.004))||any(q>vec3f(15.004))){
   return ValleyVolumeStep(valleyVolumeFallback,0);
  }
  let cell=clamp(vec3i(floor(q+sign(d)*.00025)),vec3i(0),vec3i(14));
  var skipped=false;
  var end=stop;
  // The top mip contains the entire template, including both signs. Begin
  // with 8^3-voxel blocks and refine only the intervals that can contain zero.
  for(var level=2i;level>=0i;level--){
   if(t<mixedUntil[u32(level)]){continue;}
   let width=2<<u32(level);
   let block=cell/width;
   end=min(stop,valleyVolumeExit(o,d,origin,block*width,width));
   if(end<=t){return ValleyVolumeStep(valleyVolumeFallback,0);}
   let bounds=textureLoad(valleyVolumeRanges,atlasTile*(8>>u32(level))+block,level).xy;
   // Leave one integer code of guard for directional ownership and rounding.
   if(bounds.x>=32769u||bounds.y<=32766u){
    let blockSide=select(-1,1,bounds.x>=32769u);
    if(blockSide==-1&&side==1){return ValleyVolumeStep(valleyVolumeFallback,0);}
    side=blockSide;
    skipped=true;
    break;
   }
   mixedUntil[u32(level)]=end;
  }
  if(!skipped){
   end=min(stop,valleyVolumeExit(o,d,origin,cell,1));
   if(end<=t){return ValleyVolumeStep(valleyVolumeFallback,0);}
   let result=valleyVolumeIntersect(o,d,origin,atlas,cell,q,t,end,side,material);
   if(result.hit.distance!=-1.){return result;}
   side=result.side;
  }
  if(end>=stop){
   if(stop<exit){side=select(1,-1,d.y<0.);}
   return ValleyVolumeStep(valleyVolumeMiss,side);
  }
  t=end;
 }
 return ValleyVolumeStep(valleyVolumeFallback,0);
}

// The camera has already unbent this pixel ray for the current band. A
// volume miss is definitive. Only exceptional geometry or uncertain numeric
// boundaries report -2 and request the canonical terrain intersection.
fn valleyVolumeRay(o:vec3f,d:vec3f,minimum:f32,limit:f32)->ValleyGroundHit{
 if(!(minimum>=0.&&limit>=minimum)||!all(abs(o)<=vec3f(8192.))||
    !all(abs(d)<=vec3f(4.))||abs(d.x)+abs(d.z)<1e-10){return valleyVolumeFallback;}
 let low=vec3f(valleyGroundLow().x,0.,valleyGroundLow().y);
 let size=valleyGroundSize();
 let high=vec3f(low.x+size.x,valleyGroundTop(),low.z+size.y);
 var t=minimum;
 var finish=min(limit,256.);
 for(var axis=0u;axis<3u;axis++){
  if(abs(d[axis])<1e-10){
   if(o[axis]<low[axis]||o[axis]>high[axis]){return valleyVolumeMiss;}
  }else{
   let a=(low[axis]-o[axis])/d[axis];
   let b=(high[axis]-o[axis])/d[axis];
   t=max(t,min(a,b));
   finish=min(finish,max(a,b));
  }
 }
 if(t>finish){return valleyVolumeMiss;}
 let start=t;
 var side=0i;
 let flatHeight=bitcast<f32>(valleyGroundData[13]);
 for(var step=0u;step<512u;step++){
  let p=o+d*t;
  let tile=valleySculptTile(p.xz,d.xz);
  let at=valleySculptRef(tile);
  let tx=valleySculptNext(o.x,d.x,low.x,f32(tile.x),1.);
  let tz=valleySculptNext(o.z,d.z,low.z,f32(tile.y),1.);
  let end=min(finish,min(tx,tz));
  if(end<t){return valleyVolumeFallback;}
  let top=bitcast<f32>(valleyGroundData[at+5u]);
  let offset=d.y*end;
  let padding=.00004+.0000005*(abs(o.y)+abs(offset));
  if(top<0.){return valleyVolumeFallback;}
  if(min(p.y,o.y+offset)>top+padding){
   side=1;
  }else{
   let local=p.xz-low.xz-vec2f(tile);
   let relative=p.xz-low.xz;
   // A resident/world edge and a band coincident with a tile step require
   // the original cut/closed-wall ownership rules. A normal interior band
   // cut only supplies an unresolved sign for the first volume interval.
   let boundary=p.y<.00025||t<=.000001||any(relative<vec2f(.00027))||
      any(relative>size-vec2f(.00027))||any(abs(local-round(local))<vec2f(.00006));
   if(t==start&&boundary&&p.y<=top+padding){
    return valleyVolumeFallback;
   }
   if(valleySculptCornerMask(at)!=0u||valleyGroundData[at+2u]!=0x44444444u||
      valleyGroundData[at+3u]!=0x44444444u){return valleyVolumeFallback;}
   let layer=(valleyGroundData[at]-valleyGroundData[9])/256u;
   if(layer>=256u){return valleyVolumeFallback;}
   let base=1.+bitcast<f32>(valleyGroundData[at+1u]);
   let origin=vec3f(low.x+f32(tile.x),base-flatHeight-.25,low.z+f32(tile.y));
   let result=valleyVolumeTraceTile(o,d,origin,layer,t,end,side,valleyGroundData[at+4u]&255u);
   if(result.hit.distance!=-1.){return result.hit;}
   side=result.side;
  }
  if(end>=finish){return valleyVolumeMiss;}
  if(end<=t){return valleyVolumeFallback;}
  t=end;
 }
 return valleyVolumeFallback;
}
`;function n(e){const t="fn valleyGroundRayRange(",i=" let previous=valleyGroundTrace(o,d,0.,limit,true,top);",l=e.indexOf(t),a=e.indexOf(i,l);if(l<0||a<0||e.indexOf(t,l+t.length)>=0||e.indexOf(i,a+i.length)>=0||e.includes("fn valleyVolumeRay("))throw Error("Missing sculpted camera range for terrain volumes");return e.slice(0,l)+o+e.slice(l,a)+` if(!referenceOnly){let volume=valleyVolumeRay(o,d,minimum,limit);if(volume.distance>=-1.){return volume;}}
`+e.slice(a)}export{n as useTerrainVolumeCamera};
