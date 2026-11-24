import{h as ye,D as ge}from"./PrivateValley-DbIGiaDV.js";import"./index-h6yruXEl.js";import"./index-BVQZXRiM.js";import"./ActionCycle-Crn8L2r9.js";import"./three.module-Df_d6poP.js";const ve={arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:"float32x4"}]};function ke(r,e=!1,x=!1,g=!1,s=!1){const o=r.indexOf("  // Reconstruct one ray per physical pixel"),t=r.indexOf("  var traceAux=",o);if(o<0||t<0||!r.includes("struct VisibilitySurface{")||!r.includes("fn valleySculptNormal(")||r.includes("fn terrainMeshVertex("))throw Error("Valley terrain mesh requires sculpted deferred geometry");let n=r.slice(o,t);if(x){const l=n.indexOf("  var bandNear=");if(l<0)throw Error("Missing mesh bend interval");n=n.slice(0,l)+`
  let normalPoint=(ro+rd*in.distance).xz;
  let normalTile=valleySculptRef(valleySculptTile(normalPoint,rd.xz));
  let sharedTop=meshGroundNormal(normalPoint,rd.xz,normalTile,in.face);
`+n.slice(l)}const i=e||x?`
fn meshCornerHeights(tileRef:u32,cell:vec2i)->vec4f {
  return vec4f(valleySculptNode(tileRef,cell).x,valleySculptNode(tileRef,cell+vec2i(1,0)).x,
               valleySculptNode(tileRef,cell+vec2i(0,1)).x,valleySculptNode(tileRef,cell+vec2i(1,1)).x);
}
fn meshGroundNormal(point:vec2f,direction:vec2f,tileRef:u32${x?",face:u32":""})->vec3f {
  ${x?`var shaped=false;
  if(face==0u){shaped=(valleyGroundData[tileRef+4u]&256u)==0u;}
  let anyShaped=subgroupAny(shaped);`:""}
  let tile=valleySculptTile(point,direction);
  let local=clamp(point-valleyGroundLow()-vec2f(tile),vec2f(0),vec2f(1));
  let cell=valleySculptCell(local,direction,15.);
  let uv=local*15.-vec2f(cell);
  var h:vec4f;
  ${x?`// Repeated uses of the same sculpt template may occur on different world tiles.
  let address=valleyGroundData[tileRef]+u32(cell.y)*16u+u32(cell.x);
  let firstAddress=subgroupBroadcastFirst(address);
  let samePatch=subgroupAll(address==firstAddress);
  let leader=subgroupElect();
  if((samePatch&&leader&&anyShaped)||(!samePatch&&shaped)){
    h=meshCornerHeights(tileRef,cell);
  }
  let leaderHeights=subgroupBroadcastFirst(h);
  h=select(h,leaderHeights,samePatch);
  if(!shaped){return vec3f(0,1,0);}`:"h=meshCornerHeights(tileRef,cell);"}
  ${e?`// Subtract in f32 so small changes in elevation survive at high base heights.
  let dx=15.h*mix(f16(h.y-h.x),f16(h.w-h.z),f16(uv.y));
  let dz=15.h*mix(f16(h.z-h.x),f16(h.w-h.y),f16(uv.x));
  return normalize(vec3f(-f32(dx),1.,-f32(dz)));`:`let dx=15.*mix(h.y-h.x,h.w-h.z,uv.y);
  let dz=15.*mix(h.z-h.x,h.w-h.y,uv.x);
  return normalize(vec3f(-dx,1.,-dz));`}
}
`:"";return(e?`enable f16;
`:"")+(x?`enable subgroups;
`:"")+r+i+`
struct TerrainMeshVertex {
  @builtin(position) pos:vec4f,
  @location(0) distance:f32,
  @location(1) @interpolate(flat) id:u32,
  @location(2) @interpolate(flat) face:u32,
}

@vertex fn terrainMeshVertex(@location(0) surface:vec4f,@builtin(instance_index) id:u32)->TerrainMeshVertex{
  let obj=items[id];
  if((u32(obj.band.z)&2u)==0u){return TerrainMeshVertex(vec4f(2.,2.,0.,1.),0.,id,0u);}
  let p=surface.xyz;
  let depth=dot(p.xz,view.bend.xy)+view.bend.z;
  let bent=p+vec3f(0.,obj.center.w*depth+obj.extent.w,0.)-view.at.xyz;
  let ndc=vec2f(dot(view.right.xyz,bent)/view.right.w,dot(view.up.xyz,bent)/view.up.w);
  let depthAlong=dot(view.back.xyz,bent);
  let face=u32(surface.w);
  if(view.back.w<0.){
    let cameraDistance=-view.back.w;
    let t=cameraDistance-depthAlong;
    // Keep t in homogeneous w for perspective-correct interpolation. The
    // fragment supplies the real depth so it compares with ray-traced props.
    return TerrainMeshVertex(vec4f(ndc*cameraDistance,.5*t,t),t,id,face);
  }
  return TerrainMeshVertex(vec4f(ndc,0.,1.),72.-depthAlong,id,face);
}

@fragment fn terrainMeshFragment(in:TerrainMeshVertex)->VisibilitySurface{
  let obj=items[in.id];
  let shadowPass=false;
  let m=obj.center.w;
  let b=obj.extent.w;
${n}
  let t=in.distance;
  let depthScale=select(144.,256.,view.back.w<0.);
  if(t<0.||t>=depthScale){discard;}
  let hit=ro+rd*t;
  if(view.terrainPatch.z>view.terrainPatch.x&&
    all(hit.xz>=view.terrainPatch.xy)&&all(hit.xz<=view.terrainPatch.zw)){discard;}
  if(t<bandNear-.00015||t>bandFar+.00015||any(abs(hit-obj.center.xyz)>obj.extent.xyz+vec3f(.00015))){discard;}
  if(view.viewport.z>0.&&length(hit.xz-view.at.xz)>view.viewport.z){discard;}
  let normals=array<vec3f,6>(vec3f(0.,1.,0.),vec3f(-1.,0.,0.),vec3f(1.,0.,0.),
    vec3f(0.,0.,-1.),vec3f(0.,0.,1.),vec3f(0.,-1.,0.));
  var n=normals[in.face];
  ${x?"if(in.face==0u){n=sharedTop;}":`if(in.face==0u){
    let at=valleySculptRef(valleySculptTile(hit.xz,rd.xz));
    if((valleyGroundData[at+4u]&256u)==0u){
      n=${e?"meshGroundNormal(hit.xz,rd.xz,at)":"valleySculptNormal(valleySculptPatch(hit.xz,rd.xz))"};
    }
  }`}
  return VisibilitySurface(t/depthScale,${s?"encodeHitNormal(n)":"vec4f(n,t)"},${g?"vec2u((atlasBank<<24u)|(in.id+1u),bitcast<u32>(t))":"(atlasBank<<24u)|(in.id+1u)"});
}
`}const oe={arrayStride:24,stepMode:"vertex",attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]},re="@vertex fn vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Vertex{",he="@fragment fn fragment(in:Vertex)->VisibilitySurface{";function we(r,e){const x=r.indexOf(he),g=r.indexOf("  var traceAux=",x);if(x<0||g<0)throw Error("Unknown Valley terrain chunk bounds fragment layout");const s=x+he.length;let o=s,t=1;for(;o<r.length&&t;)r[o]==="{"?t++:r[o]==="}"&&t--,o++;if(t||g>=o)throw Error("Unknown Valley terrain chunk bounds fragment layout");let n=r.slice(g,o);const i="valleyGroundRayRange(ro+vec3f(0,1,0),rd,bandNear,bandFar,shadowPass)",u=n.includes(i)?i:"valleyGroundRay(ro+vec3f(0,1,0),rd,bandFar)",w=e==="both"&&u===i;if(e){const h=`    let valleyHit=${u};`,v=n.indexOf(h);if(v<0||n.indexOf(h,v+h.length)>=0)throw Error("Unknown Valley terrain chunk ray layout");const y=u.replace("bandFar","chunkTraceFar");n=n.replace(h,w?`    var valleyHit:ValleyGroundHit;
    if(chunkTraceNear>=0.){
      valleyHit=valleyGroundTrace(ro+vec3f(0,1,0),rd,chunkTraceNear,chunkTraceFar,chunkTraceNear==0.,valleyGroundTop());
    }else{
      valleyHit=${y};
    }`:`    let valleyHit=${y};`)}return`
@fragment fn chunkBoundsFragment(chunk:ValleyChunkVertex)->VisibilitySurface{
  let in=Vertex(chunk.pos,chunk.uv,chunk.id);${r.slice(s,g)}${e?`  var chunkTraceFar=bandFar;
`:""}${w?`  var chunkTraceNear=-1.;
`:""}
  if(all(chunk.low<=chunk.high)){
    let parallel=abs(rd)<vec3f(1e-7);
    let inverse=1./select(rd,vec3f(1.),parallel);
    let a=(chunk.low-ro)*inverse;
    let b=(chunk.high-ro)*inverse;
    let lo=select(min(a,b),vec3f(-1e20),parallel);
    let hi=select(max(a,b),vec3f(1e20),parallel);
    let near=max(max(0.,bandNear-.0003),max(lo.x,max(lo.y,lo.z)));
    let far=min(min(select(144.,256.,view.back.w<0.),bandFar+.0003),min(hi.x,min(hi.y,hi.z)));
    if(near>far+.0003){discard;}
${e?`    // Keep the reference traversal for uncertain near-parallel divisions.
    // The box already has world-space padding. Leave additional time on its
    // endpoints for slab roundoff and the patch solver's root tolerances.
    if(!any(parallel&(rd!=vec3f(0.)))){
      let clippedFar=min(bandFar,min(hi.x,min(hi.y,hi.z))+.0003);
      if(clippedFar>=max(bandNear,near-.0003)){
        chunkTraceFar=clippedFar;
${w?`        chunkTraceNear=max(bandNear,near-.0003);
`:""}      }
    }
`:""}  }
${n}
`}function Me(r,e=!1,x=!1,g){const s=r.indexOf(re);if(s<0||r.indexOf(re,s+re.length)>=0||r.includes("fn valleyTerrainChunkBoundsVertex("))throw Error("Unknown Valley terrain chunk bounds vertex layout");return r.slice(0,s)+"fn valleyTerrainOriginalVertex(v:u32,i:u32)->Vertex{"+r.slice(s+re.length)+`
${re}
  return valleyTerrainOriginalVertex(v,i);
}

struct ValleyChunkProjection {
  screenLo:vec2f,
  screenHi:vec2f,
  nearest:f32,
}

struct ValleyChunkVertex {
  @builtin(position) pos:vec4f,
  @location(0) uv:vec2f,
  @location(1) @interpolate(flat) id:u32,
  @location(2) @interpolate(flat) low:vec3f,
  @location(3) @interpolate(flat) high:vec3f,
}

fn valleyChunkFallback(original:Vertex)->ValleyChunkVertex{
  return ValleyChunkVertex(original.pos,original.uv,original.id,vec3f(1.),vec3f(-1.));
}

fn valleyProjectChunkColumn(bounds:ValleyChunkProjection,xz:vec2f,d:f32,
  height:vec2f,bend:vec2f,lens:vec2f,distance:f32,perspective:bool)->ValleyChunkProjection{
  let relative=xz-view.at.xz;
  let y=height+vec2f(bend.x*d+bend.y-view.at.y);
  let horizontal=vec2f(dot(view.right.xz,relative),dot(view.up.xz,relative));
  let vertical=vec2f(view.right.y,view.up.y);
  let eyeW=vec2f(distance-dot(view.back.xz,relative))-view.back.y*y;
  let w=select(vec2f(1.),eyeW,perspective);
  // Clamp only the divisor here. The caller keeps the original quad whenever
  // any real W is near or behind the eye.
  let a=(horizontal+vertical*y.x)*lens/max(w.x,.01);
  let b=(horizontal+vertical*y.y)*lens/max(w.y,.01);
  return ValleyChunkProjection(min(bounds.screenLo,min(a,b)),max(bounds.screenHi,max(a,b)),
    min(bounds.nearest,min(w.x,w.y)));
}

@vertex fn valleyTerrainChunkBoundsVertex(
  @builtin(vertex_index) v:u32,${e?"":"@builtin(instance_index) i:u32,"}
  @location(0) lo:vec3f,@location(1) hi:vec3f,${x?"@location(2) strip:u32,":""}
)->ValleyChunkVertex{
  ${e?`let i=${x?"strip":"v/4u"}; let corner=v%4u; let original=valleyTerrainOriginalVertex(select(corner,5u,corner==3u),i);`:"let original=valleyTerrainOriginalVertex(v%6u,i);"}
  let obj=items[i];
  let m=obj.center.w;
  let b=obj.extent.w;
  let halfViewport=vec2f(view.right.w,view.up.w);
  let perspective=view.back.w<0.;
  let distance=select(1.,-view.back.w,perspective);
  let lens=vec2f(distance)/halfViewport;
  let scale=1.+distance+dot(abs(lo)+abs(hi)+abs(view.at.xyz),vec3f(1.))+
    abs(view.bend.z)+abs(b)+abs(m)*max(abs(obj.band.x),abs(obj.band.y));
  if(!(all(lo<=hi)&&scale<8192.&&distance>=1.&&distance<=256.&&abs(m)<=8.&&obj.band.x<=obj.band.y&&
    all(halfViewport>vec2f(0.))&&all(lens<=vec2f(16.))&&
    all(view.viewport.xy>=vec2f(1.)))){return valleyChunkFallback(original);}

  // Include the original solver's world-space acceptance tolerances,
  // including parallel and grazing band tests. Bend is affine per strip.
  let pad=.0005+.000004*(scale+256.);
  let guard=pad*(1.+max(lens.x,lens.y));
  let low=lo.xz-vec2f(pad);
  let high=hi.xz+vec2f(pad);
  let height=vec2f(lo.y-pad,hi.y+pad);
  let polygon=array<vec2f,4>(low,vec2f(high.x,low.y),high,vec2f(low.x,high.y));
  let axis=view.bend.xy;
  let depths=vec4f(dot(polygon[0],axis),dot(polygon[1],axis),dot(polygon[2],axis),dot(polygon[3],axis))+
    vec4f(view.bend.z);
  let band=select(vec2f(-1e20,1e20),obj.band.xy+vec2f(-pad,pad),view.bend.w>0.);
  let bend=vec2f(m,b);
  var bounds=ValleyChunkProjection(vec2f(1e20),vec2f(-1e20),1e20);
  for(var edge=0u;edge<4u;edge++){
    let next=(edge+1u)%4u;
    let a=depths[edge];
    let z=depths[next];
    if(a>=band.x&&a<=band.y){
      bounds=valleyProjectChunkColumn(bounds,polygon[edge],a,height,bend,lens,distance,perspective);
    }
    for(var plane=0u;plane<2u;plane++){
      let d=band[plane];
      if(d>min(a,z)&&d<max(a,z)){
        let xz=mix(polygon[edge],polygon[next],(d-a)/(z-a));
        bounds=valleyProjectChunkColumn(bounds,xz,d,height,bend,lens,distance,perspective);
      }
    }
  }

  if(bounds.nearest==1e20){return valleyChunkFallback(Vertex(vec4f(2.,2.,0.,1.),vec2f(2.),i));}
  // Positive W makes projected extrema occur on the clipped prism corners.
  if(!(bounds.nearest>.01+guard)){return valleyChunkFallback(original);}
  // Include quotient error and a pixel of raster coverage on each edge.
  let margin=vec2f(2.*guard/(bounds.nearest-guard)+.00005)+vec2f(2.)/view.viewport.xy;
  let p=clamp(original.pos.xy,bounds.screenLo-margin,bounds.screenHi+margin);
  return ValleyChunkVertex(vec4f(p,original.pos.zw),p,i,lo-vec3f(pad),hi+vec3f(pad));
}
${we(r,g)}
`}const Q=16,se=6,xe=se*4,pe=512,ie="@vertex fn vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Vertex{",Y=.04,ze={arrayStride:xe,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x4"},{shaderLocation:1,offset:16,format:"uint32"}]};function Ve(r){const e=r.indexOf(ie);if(e<0||r.indexOf(ie,e+ie.length)>=0||r.includes("fn valleyTerrainColumnVertex("))throw Error("Unknown Valley terrain column vertex layout");return r.slice(0,e)+"fn valleyTerrainColumnOriginal(v:u32,i:u32)->Vertex{"+r.slice(e+ie.length)+`
@vertex fn valleyTerrainColumnVertex(@builtin(vertex_index) v:u32,@location(0) rect:vec4f,@location(1) id:u32)->Vertex{
  let original=valleyTerrainColumnOriginal(v,id);
  let p=clamp(original.pos.xy,rect.xy,rect.zw);
  return Vertex(vec4f(p,original.pos.zw),p,id);
}
`}function le(r,e,x,g,s,o,t){const{min:n,max:i}=r,l=(n[0]+i[0])*.5,u=(n[2]+i[2])*.5,w=(i[0]-n[0])*.5+Y,h=(i[2]-n[2])*.5+Y,v=e[76],y=e[77],a=v*l+y*u+e[78],E=Math.abs(v)*w+Math.abs(y)*h+Y,S=Math.max(a-E,s),A=Math.min(a+E,o);if(S>A)return 0;const p=l-e[12],R=u-e[14],F=e[98];if(F>0){const _=Math.max(0,Math.abs(p)-w),L=Math.max(0,Math.abs(R)-h);if(_*_+L*L>(F+Y)**2)return 0}const I=(n[1]+i[1])*.5+x*(S+A)*.5+g-e[13],B=(i[1]-n[1])*.5+Math.abs(x)*(A-S)*.5+Y,N=-e[11],U=N/e[3],C=N/e[7],j=N-e[8]*p-e[9]*I-e[10]*R,c=Math.abs(e[8])*w+Math.abs(e[9])*B+Math.abs(e[10])*h+Y,f=j-c,m=j+c;if(m<0||f>256+Y)return 0;const T=(e[0]*p+e[1]*I+e[2]*R)*U,z=(e[4]*p+e[5]*I+e[6]*R)*C,O=(Math.abs(e[0])*w+Math.abs(e[1])*B+Math.abs(e[2])*h+Y)*U,d=(Math.abs(e[4])*w+Math.abs(e[5])*B+Math.abs(e[6])*h+Y)*C;if(Math.abs(T)>O+m||Math.abs(z)>d+m)return 0;if(f<=.05)return-1;const b=2/e[96]+5e-5,V=2/e[97]+5e-5,G=T-O,k=z-d,$=T+O,D=z+d;return t[0]=G/(G>=0?m:f)-b,t[1]=k/(k>=0?m:f)-V,t[2]=$/($>=0?f:m)+b,t[3]=D/(D>=0?f:m)+V,1}function Se(r){const e=new ArrayBuffer(pe*Q*xe),x=r.createBuffer({label:"Valley terrain screen columns",size:e.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),g=new Float32Array(e),s=new Uint32Array(e),o=new Float64Array(Q),t=new Float64Array(Q),n=new Float64Array(4);let i=0;function l(h,v,y,a,E){g[i]=h,g[i+1]=v,g[i+2]=y,g[i+3]=a,s[i+4]=E,i+=se}function u(){const h=Math.max(0,Math.floor((n[0]+1)*Q*.5)),v=Math.min(Q-1,Math.floor((n[2]+1)*Q*.5));for(let y=h;y<=v;y++)o[y]=Math.min(o[y],n[1]),t[y]=Math.max(t[y],n[3])}function w(h,v,y,a,E,S,A){const p=-a[11];if(S+A>pe||!(p>=1&&p<=256&&a[96]>=1&&a[97]>=1&&a[3]>0&&a[7]>0&&p/a[3]<=16&&p/a[7]<=16))return!1;const R=a[12]+a[8]*p,F=a[13]+a[9]*p,I=a[14]+a[10]*p,B=a[76]*R+a[77]*I+a[78],N=y.chunks,U=y.nodes,C=S*Q*se;i=C;for(let j=S;j<S+A;j++){const c=j*40;if((E[c+38]&2)===0)continue;const f=E[c+3],m=E[c+7],T=E[c+36]-Y,z=E[c+37]+Y;if(!(T<=z&&Math.abs(f)<=8&&Math.abs(m)+Math.abs(a[78])+Math.abs(R)+Math.abs(F)+Math.abs(I)<4096))return!1;o.fill(2),t.fill(-2);let O=!1;for(let d=0;d<U.length&&!O;){const b=U[d];if(le(b,a,f,m,T,z,n)===0){d=b.skip;continue}if(b.skip===d+1)for(let V=b.start;V<b.end;V++){const G=le(N[V],a,f,m,T,z,n);if(G<0){O=!0;break}G>0&&u()}d++}if(!O&&y.bottom>=0&&F-(f*B+m)<=-1+Y){const d=le(N[y.bottom],a,f,m,T,z,n);d<0&&(O=!0),d>0&&u()}if(O){l(-1,-1,1,1,j);continue}for(let d=0;d<Q;d++){const b=Math.max(-1,o[d]),V=Math.min(1,t[d]);b<V&&l(d*2/Q-1,b,(d+1)*2/Q-1,V,j)}}if(i!==C){const j=C*4,c=(i-C)*4;r.queue.writeBuffer(x,j,e,j,c),h.setPipeline(v),h.setVertexBuffer(0,x,j,c),h.draw(6,(i-C)/se)}return!0}return{vertexBuffer:x,draw:w}}const ae=6,ue=ae+1,ce=ue*Float32Array.BYTES_PER_ELEMENT,Be=8192;function Ce(r,e,x){const g=Math.min(Be,Math.floor(r.limits.maxBufferSize/ce));if(g<1)throw Error("Device cannot allocate a packed terrain instance");const s=e.length,o=new Float32Array(s*ae);for(let w=0;w<s;w++){const{min:h,max:v}=e[w],y=w*ae;for(let a=0;a<3;a++)o[y+a]=h[a]-x,o[y+3+a]=v[a]+x}const t=new Float32Array(g*ue),n=new Uint32Array(t.buffer),i=r.createBuffer({label:"Valley packed terrain bounds",size:t.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});let l=0,u=0;return{vertexBuffer:i,beginFrame(){l=0,u=0},append(w,h,v){if(!Number.isInteger(w)||!Number.isInteger(h)||w<0||h<0||w+h>s||u+h>g||!Number.isInteger(v)||v<0||v>4294967295)return!1;let y=w*ae,a=u*ue;for(let E=0;E<h;E++){for(let S=0;S<ae;S++)t[a++]=o[y++];n[a++]=v}return u+=h,!0},draw(w){const h=u-l;if(!h)return;const v=l*ce;r.queue.writeBuffer(i,v,t.buffer,v,h*ce),w.setVertexBuffer(0,i),w.draw(4,h,0,l),l=u},cancel(){u=l},destroy(){i.destroy()}}}const de=40,q=.025;function me(r,e){const x=[];function g(s,o){const t={min:[1/0,1/0,1/0],max:[-1/0,-1/0,-1/0],start:s,end:o,skip:0};if(x.push(t),o-s>8){const n=Math.floor((s+o)*.5),i=g(s,n),l=g(n,o);for(let u=0;u<3;u++)t.min[u]=Math.min(i.min[u],l.min[u]),t.max[u]=Math.max(i.max[u],l.max[u])}else for(let n=s;n<o;n++){const i=r[n];for(let l=0;l<3;l++)t.min[l]=Math.min(t.min[l],i.min[l]),t.max[l]=Math.max(t.max[l],i.max[l])}return t.skip=x.length,t}return e>0&&g(0,e),x}function fe(r,e,x,g,s,o){const t=r.min,n=r.max,i=(t[0]+n[0])*.5,l=(t[2]+n[2])*.5,u=(n[0]-t[0])*.5,w=(n[2]-t[2])*.5,h=e[76]*i+e[77]*l+e[78],v=Math.abs(e[76])*u+Math.abs(e[77])*w+q,y=Math.max(h-v,s),a=Math.min(h+v,o);if(y>a)return!1;const E=i-e[12],S=l-e[14],A=e[98];if(A>0){const j=Math.max(0,Math.abs(E)-u),c=Math.max(0,Math.abs(S)-w);if(j*j+c*c>(A+q)**2)return!1}const p=(t[1]+n[1])*.5+x*(y+a)*.5+g-e[13],R=(n[1]-t[1])*.5+Math.abs(x)*(a-y)*.5+q,F=-e[11]-e[8]*E-e[9]*p-e[10]*S,I=Math.abs(e[8])*u+Math.abs(e[9])*R+Math.abs(e[10])*w+q;if(F+I<0||F-I>256+q)return!1;const B=e[0]*E+e[1]*p+e[2]*S,N=Math.abs(e[0])*u+Math.abs(e[1])*R+Math.abs(e[2])*w+q;if(Math.abs(B)>N+(F+I)*e[3]/-e[11])return!1;const U=e[4]*E+e[5]*p+e[6]*S,C=Math.abs(e[4])*u+Math.abs(e[5])*R+Math.abs(e[6])*w+q;return Math.abs(U)<=C+(F+I)*e[7]/-e[11]}async function ne(r,e,x,g=0,s="mesh",o=!1,t=!0,n=ye){const i=s==="packed",l=s==="batched",u=i||l,w=s==="exitBounds"?"far":s==="rayWindow"?"both":void 0,h=s==="meshFill",v=s==="bounds"||s==="terraces"||!!w||u,y=s==="columns",a=s==="mesh"||h,E=u?1:6,S=`Valley terrain ${s} ${o?"gap repair":"visibility"}`,A=a&&t&&r.features.has("shader-f16"),p=a&&t&&r.features.has("subgroups"),R=r.createShaderModule({label:S,code:y?Ve(x):v?Me(x,u,i,w):ke(x,A,p,n.record==="rg32uint",n.aux==="rg8unorm")}),F={};g&&(F.atlasBank=g),!a&&ge&&(F.coverageStats=0);const I={compare:"always",passOp:"replace"},B=await r.createRenderPipelineAsync({label:S,layout:e,primitive:{topology:u?"triangle-strip":"triangle-list"},vertex:{module:R,entryPoint:y?"valleyTerrainColumnVertex":v?"valleyTerrainChunkBoundsVertex":"terrainMeshVertex",buffers:[y?ze:i?{arrayStride:28,stepMode:"instance",attributes:[...oe.attributes,{shaderLocation:2,offset:24,format:"uint32"}]}:l?{...oe,stepMode:"instance"}:v?oe:ve],constants:a?void 0:{coverageMode:0}},fragment:{module:R,entryPoint:y?"fragment":v?"chunkBoundsFragment":"terrainMeshFragment",constants:F,targets:[{format:n.aux},{format:n.record}]},depthStencil:{format:h||o?"depth24plus-stencil8":"depth24plus",depthWriteEnabled:!0,depthCompare:"less",...o?{stencilFront:{compare:"equal"},stencilBack:{compare:"equal"},stencilReadMask:1,stencilWriteMask:0}:{},...h?{stencilFront:I,stencilBack:I,stencilReadMask:1,stencilWriteMask:1}:{}}}).catch(c=>{if(!A&&!p)throw c;console.warn("Using scalar terrain mesh normals",c)});if(!B)return ne(r,e,x,g,s,o,!1,n);const N=B;async function U(c){var _,L;const f=v?c.chunks.length*E*24:((_=c.vertices)==null?void 0:_.byteLength)??0,m=a?Math.ceil((((L=c.indices)==null?void 0:L.byteLength)??0)/4)*4:0;if(!c.chunks.length||v&&!f||a&&(!f||!m||f%16!==0)||Math.max(f,m)>r.limits.maxBufferSize)throw Error("Invalid Valley terrain mesh size");for(const M of c.chunks){for(let P=0;P<3;P++)if(!Number.isFinite(M.min[P])||!Number.isFinite(M.max[P])||M.min[P]>M.max[P])throw Error("Invalid Valley terrain chunk bounds");if(a&&!(Number.isInteger(M.firstIndex)&&Number.isInteger(M.indexCount)&&Number.isInteger(M.baseVertex)&&M.firstIndex>=0&&M.indexCount>0&&M.firstIndex+M.indexCount<=c.indices.length&&M.baseVertex>=0&&M.baseVertex<c.vertices.length/4))throw Error("Invalid Valley terrain mesh chunk")}const T=c.chunks.length-1,z=c.chunks[T],O=!a&&T>0&&z.min[1]===-1&&z.max[1]===-1&&(s==="terraces"||c.chunks.every(M=>z.min[0]<=M.min[0]&&z.min[2]<=M.min[2]&&z.max[0]>=M.max[0]&&z.max[2]>=M.max[2]))?T:-1,d=me(c.chunks,O<0?c.chunks.length:O);let b,V,G,k;r.pushErrorScope("out-of-memory"),r.pushErrorScope("validation");try{if(i)G=Ce(r,c.chunks,q),b=G.vertexBuffer;else if(y)k=Se(r),b=k.vertexBuffer;else{b=r.createBuffer({label:"Valley terrain vertices",size:f,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0});const M=new Float32Array(b.getMappedRange());if(v)for(let P=0;P<c.chunks.length;P++){const te=c.chunks[P];for(let ee=0;ee<E;ee++){const W=(P*E+ee)*6;for(let H=0;H<3;H++)M[W+H]=te.min[H]-q,M[W+3+H]=te.max[H]+q}}else M.set(c.vertices);b.unmap()}a&&(V=r.createBuffer({label:"Valley terrain indices",size:m,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0}),new Uint16Array(V.getMappedRange()).set(c.indices),V.unmap())}catch(M){throw b==null||b.destroy(),V==null||V.destroy(),await Promise.allSettled([r.popErrorScope(),r.popErrorScope()]),M}try{const P=(await Promise.all([r.popErrorScope(),r.popErrorScope()])).find(Boolean);if(P)throw Error(P.message)}catch(M){throw b.destroy(),V==null||V.destroy(),M}const $=b,D=V;return{vertices:$,indices:D,chunks:c.chunks,nodes:d,bottom:O,packed:G,columns:k,destroy(){$.destroy(),D==null||D.destroy()}}}function C(c,f,m,T,z){return f.packed?f.packed.append(m,T,z)?!0:(f.packed.cancel(),!1):(l?c.draw(4,T,z*4,m):c.draw(T*6,1,m*6,z),!0)}function j(c,f,m,T,z,O){var V,G;if(!(m[3]>0&&m[7]>0&&m[11]<=-1&&m[79]>0&&O>0&&z>=0&&(z+O)*de<=T.length))return!1;const d=z+O;for(let k=z;k<d;k++)if(T[k*de+11]!==0)return!1;if(y)return((V=f.columns)==null?void 0:V.draw(c,N,f,m,T,z,O))??!1;i||(c.setPipeline(N),f.resident||c.setVertexBuffer(0,f.vertices)),f.indices&&c.setIndexBuffer(f.indices,"uint16");let b;for(let k=z;k<d;k++){const $=k*de;if((T[$+38]&2)===0)continue;const D=T[$+3],_=T[$+7],L=T[$+36]-q,M=T[$+37]+q;let P=-1;const te=f.chunks,ee=f.nodes;for(let W=0;W<ee.length;){const H=ee[W];if(!fe(H,m,D,_,L,M)){if(P>=0){if(!C(c,f,P,H.start-P,k))return!1;P=-1}W=H.skip;continue}if(l&&H.skip===W+1)P<0&&(P=H.start);else if(H.skip===W+1)for(let J=H.start;J<H.end;J++){const K=te[J],Z=fe(K,m,D,_,L,M);if(v){if(Z)P<0&&(P=J);else if(P>=0){if(!C(c,f,P,J-P,k))return!1;P=-1}}else if(Z){const X=(G=f.resident)==null?void 0:G[J];X&&X.vertices!==b&&(c.setVertexBuffer(0,X.vertices),c.setIndexBuffer(X.indices,"uint16"),b=X.vertices),c.drawIndexed(K.indexCount,1,K.firstIndex,K.baseVertex,k)}}W++}if(P>=0){const W=(f.bottom<0?te.length:f.bottom)-P;if(!C(c,f,P,W,k))return!1}if(f.bottom>=0){const W=-m[11],H=m[12]+m[8]*W,J=m[14]+m[10]*W,K=H*m[76]+J*m[77]+m[78];if(m[13]+m[9]*W-(D*K+_)<=-1+q&&fe(te[f.bottom],m,D,_,L,M)&&!C(c,f,f.bottom,1,k))return!1}}return f.packed&&(c.setPipeline(N),f.packed.draw(c)),!0}return{upload:U,draw:j,normalMode:A?p?"halfShared":"half":p?"shared":"original"}}const Te=32,Pe=512*1024;function Ee(r,{chunk:e,vertices:x,indices:g}){const{firstIndex:s,indexCount:o,baseVertex:t}=e,n=Math.ceil(g.byteLength/4)*4;if(x.byteLength%16!==0||Math.max(x.byteLength,n)>r.limits.maxBufferSize||s===void 0||!Number.isInteger(s)||s<0||o===void 0||!Number.isInteger(o)||o<=0||s+o>g.length||t===void 0||!Number.isInteger(t)||t<0||t>=x.length/4)throw Error("Invalid resident Valley terrain mesh chunk");for(let i=0;i<3;i++)if(!Number.isFinite(e.min[i])||!Number.isFinite(e.max[i])||e.min[i]>e.max[i])throw Error("Invalid resident Valley terrain chunk bounds")}function Fe(r,e,x,g){let s,o;try{s=r.createBuffer({label:"Valley resident terrain page vertices",size:x,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),o=r.createBuffer({label:"Valley resident terrain page indices",size:Math.ceil(g/2)*4,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0});const t=new Float32Array(s.getMappedRange()),n=new Uint16Array(o.getMappedRange());let i=0,l=0;for(const u of e)t.set(u.vertices,i),n.set(u.indices,l),i+=u.vertices.length,l+=u.indices.length;return s.unmap(),o.unmap(),{vertices:s,indices:o,references:0}}catch(t){throw s==null||s.destroy(),o==null||o.destroy(),t}}function Re(r){let e=new Map,x=new Set;const g=new Set;let s=0,o=!1;function t(l){g.delete(l)&&(l.vertices.destroy(),l.indices.destroy())}function n(l){--l.references===0&&t(l)}async function i(l){if(o)return;const u=++s,w=new Set(l.keys);if(w.size!==l.keys.length)throw Error("Duplicate resident Valley terrain chunk keys");const h=new Map;for(const a of l.added){if(!w.has(a.key)||h.has(a.key))throw Error("Unexpected resident Valley terrain chunk upload");Ee(r,a),h.set(a.key,a)}for(const a of w)if(!e.has(a)&&!h.has(a))throw Error("Missing resident Valley terrain chunk");const v=new Map,y=[];try{if(h.size){r.pushErrorScope("out-of-memory"),r.pushErrorScope("validation");try{let C=function(){if(!j.length)return;const T=Fe(r,j,f,m);y.push(T),g.add(T);let z=0,O=0;for(const{key:d,chunk:b,vertices:V,indices:G}of j)v.set(d,{page:T,chunk:{...b,firstIndex:z+b.firstIndex,baseVertex:O+b.baseVertex}}),z+=G.length,O+=V.length/4;j.length=0,f=0,m=0};const j=[],c=Math.min(Pe,r.limits.maxBufferSize);let f=0,m=0;for(const T of w){const z=h.get(T);z&&((j.length===Te||f+z.vertices.byteLength+Math.ceil((m+z.indices.length)/2)*4>c)&&C(),j.push(z),f+=z.vertices.byteLength,m+=z.indices.length)}C()}catch(C){throw await Promise.allSettled([r.popErrorScope(),r.popErrorScope()]),C}const[B,N]=await Promise.all([r.popErrorScope(),r.popErrorScope()]);if(u!==s)return;const U=B??N;if(U)throw Error(U.message)}const a=new Map;for(const B of w)a.set(B,v.get(B)??e.get(B));const E=Array.from(a.values()),S=E.map(B=>B.page),A=E.map(B=>B.chunk),p=me(A,A.length),R=new Set(S);let F=0;for(const B of R)B.references+=2,F+=B.vertices.size+B.indices.size;for(const B of x)n(B);if(e=a,x=R,y.length=0,!S.length)return;let I=!1;return{vertices:S[0].vertices,chunks:A,nodes:p,bottom:-1,resident:S,residentBytes:F,destroy(){if(!I){I=!0;for(const B of R)n(B)}}}}catch(a){if(u!==s)return;throw a}finally{for(const a of y)t(a)}}return{update:i,destroy(){if(!o){o=!0,s++;for(const l of x)n(l);e.clear();for(const l of g)t(l)}}}}function Ne(r,e,x){const{reusePieces:g,reuseFlatChunks:s}=x,o=Re(r);let t,n=[],i=0,l=Promise.resolve(),u;async function w(h,v,y){var B;if(y!==i)return;t||(t=new Worker(new URL("/Fable-Crown-Game/whispers-preview/assets/valley-terrain-surface.worker-BYpzbXDA.js",import.meta.url),{type:"module"}),n=[]);const a=t,E=await new Promise((N,U)=>{u=()=>N(void 0),a.onmessage=C=>N(C.data),a.onerror=C=>{a.terminate(),t=void 0,U(Error(C.message))},a.postMessage({mode:"world",ground:{data:h.data,size:h.size,low:h.low,worldLow:h.worldLow},edges:[0,1,2,3].map(C=>!!(v&1<<C)),boundedRepair:!!e,reusePieces:g,reuseFlatChunks:s,known:n})}).finally(()=>{u=void 0,a.onmessage=a.onerror=null});if(!E||y!==i)return;if(E.error)throw Error(E.error);const{delta:S,bakeMs:A}=E,p=performance.now(),R=await o.update(S);if(n=S.keys,!R||y!==i){R==null||R.destroy();return}let F;if(e&&((B=S.repairChunks)!=null&&B.length))try{F=await e.upload({chunks:S.repairChunks})}catch(N){console.warn("Using full terrain gap repair",N)}if(y!==i){R.destroy(),F==null||F.destroy();return}const I=S.added.reduce((N,U)=>N+U.vertices.byteLength+U.indices.byteLength,0);return{mesh:R,repair:F,stats:{chunks:R.chunks.length,triangles:R.chunks.reduce((N,U)=>N+U.indexCount/3,0),bytes:R.residentBytes+((F==null?void 0:F.vertices.size)??0),uploadedBytes:I,repairBytes:(F==null?void 0:F.vertices.size)??0,rebuilt:S.rebuilt,reused:S.reused,total:S.total,bakeMs:A,uploadMs:performance.now()-p,maxHeightError:S.maxHeightError,reusePieces:g,pieceBuilds:S.pieceBuilds,pieceReuses:S.pieceReuses,pieceLookups:S.pieceLookups,flatChunkHits:S.flatChunkHits}}}return{update(h,v){const y=++i,a=l.then(()=>w(h,v,y));return l=a.then(()=>{},()=>{}),a},destroy(){i++,u==null||u(),t==null||t.terminate(),t=void 0,o.destroy()}}}async function $e(r,e,x,g,s,o,t,n,i,l=ye){const u=n!==void 0;let w=!1,h=!1;const v=await ne(r,e,x,s,o,!1,!0,l),y=o==="mesh"||o==="meshFill";y&&(t.dataset.terrainNormals=v.normalMode);const a=g&&!y?await ne(r,e,g,s,o,!1,!0,l):v,E=u?await ne(r,e,x,s,"bounds",!0,!0,l):void 0,S=E&&g?await ne(r,e,g,s,"bounds",!0,!0,l):E,A=i?Ne(r,E,i):void 0;let p,R=!1,F=!1,I,B,N=-1,U,C,j,c,f=0;function m(){f++,U==null||U.terminate(),U=void 0,C==null||C.destroy(),C=void 0,I==null||I.destroy(),I=void 0,u&&(t.dataset.terrainRepairBounds="preparing")}function T(d){t.dataset.terrainSurface="fallback",console.warn("Terrain surface trial fell back to SDF",d)}function z(){var d,b,V;(d=p==null?void 0:p.result)==null||d.mesh.destroy(),(V=(b=p==null?void 0:p.result)==null?void 0:b.repair)==null||V.destroy(),p=void 0}function O(d,b){var G;if(!A||y&&((G=d.sculpted)!=null&&G.waterCorners)||(R=!0,d===B&&b===N||(p==null?void 0:p.ground)===d&&p.edges===b))return;z();const V={ground:d,edges:b};p=V,A.update(d,b).then(k=>{var $;if(p!==V){k==null||k.mesh.destroy(),($=k==null?void 0:k.repair)==null||$.destroy();return}k?V.result=k:V.failed={reason:"No terrain mesh was prepared"}}).catch(k=>{p===V&&(V.failed={reason:k})})}return{stage:O,discard(d){(p==null?void 0:p.ground)===d&&d!==B&&z()},submitted(){R&&(F=!0)},get ready(){return!!C},get exactRequired(){return h},frame(d,b,V,G){var D,_;if(j=b,c=V,h=y&&!!((D=d.sculpted)!=null&&D.waterCorners),h){d!==B&&(m(),z(),B=d,N=-1),t.dataset.terrainSurface="exact-diagonals";return}w=n==="bounds"||n==="wide"&&G>=70,(_=C==null?void 0:C.packed)==null||_.beginFrame();const k=b[136]+2*b[137]+4*b[138]+8*b[139];if(R){if((d!==B||k!==N)&&(O(d,k),m(),B=d,N=k,F=!1,t.dataset.terrainSurface="preparing"),(p==null?void 0:p.ground)===d&&p.edges===k)if(p.result){const{mesh:L,repair:M,stats:P}=p.result;p=void 0,C=L,I=M,t.dataset.terrainSurfaceStats=JSON.stringify({...P,prestaged:!F}),t.dataset.terrainSurface="ready"}else p.failed&&(T(p.failed.reason),p=void 0);return}if(d===B&&k===N)return;m(),B=d,N=k;const $=f;if(t.dataset.terrainSurface="preparing",A){A.update(d,k).then(L=>{var M;if(L){if($!==f){L.mesh.destroy(),(M=L.repair)==null||M.destroy();return}C=L.mesh,I=L.repair,t.dataset.terrainSurfaceStats=JSON.stringify(L.stats),t.dataset.terrainSurface="ready"}}).catch(L=>{$===f&&T(L)});return}try{const L=new Worker(new URL("/Fable-Crown-Game/whispers-preview/assets/valley-terrain-surface.worker-BYpzbXDA.js",import.meta.url),{type:"module"});U=L,L.onerror=M=>{$===f&&(L.terminate(),U=void 0,T(M.message))},L.onmessage=async M=>{var W,H,J;if(L.terminate(),$!==f)return;U=void 0;const{mesh:P,bakeMs:te,error:ee}=M.data;if(!P||ee){T(ee);return}try{const K=performance.now(),Z=await v.upload(P);if($!==f){Z.destroy();return}let X;if(E&&M.data.repairChunks)try{X=await E.upload({chunks:M.data.repairChunks})}catch(be){console.warn("Using full terrain gap repair",be)}if($!==f){Z.destroy(),X==null||X.destroy();return}C=Z,I=X,t.dataset.terrainSurfaceStats=JSON.stringify({chunks:P.chunks.length,triangles:(((W=P.indices)==null?void 0:W.length)??0)/3,bytes:Z.vertices.size+(((H=Z.indices)==null?void 0:H.size)??0)+((X==null?void 0:X.vertices.size)??0),uploadedBytes:Z.vertices.size+(((J=Z.indices)==null?void 0:J.size)??0),repairBytes:(X==null?void 0:X.vertices.size)??0,bakeMs:te,uploadMs:performance.now()-K,maxHeightError:P.maxHeightError}),t.dataset.terrainSurface="ready"}catch(K){$===f&&T(K)}},L.postMessage({ground:{data:d.data,size:d.size,low:d.low,worldLow:d.worldLow},edges:[0,1,2,3].map(M=>!!(k&1<<M)),boundedRepair:u,mode:y?"mesh":o==="packed"||o==="batched"?"batched":o==="terraces"?"terraces":"bounds"})}catch(L){T(L)}},draw(d,b,V,G){if(!C)return!1;const k=(G?a:v).draw(d,C,j,c,b,V);return k&&t.dataset.terrainSurface!=="active"&&(t.dataset.terrainSurface="active"),k},drawRepair(d,b,V,G=!1){if(!u)return!1;if(!w&&!G)return t.dataset.terrainRepairBounds!=="broad"&&(t.dataset.terrainRepairBounds="broad"),!1;const k=V?S:E,$=!!k&&!!I&&k.draw(d,I,j,c,0,b),D=$?"active":"fallback";return t.dataset.terrainRepairBounds!==D&&(t.dataset.terrainRepairBounds=D),$},destroy(){m(),z(),A==null||A.destroy()}}}export{$e as createTerrainSurface};
