import{f as ye,D as be}from"./PrivateValley-CePOxbkE.js";import"./index-B7R1N-2U.js";import"./ActionCycle-ewo-D3Sa.js";import"./three.module-Df_d6poP.js";import"./index-D3PXXP1u.js";const ge={arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:"float32x4"}]};function ve(a,e=!1,p=!1,b=!1){const i=a.indexOf("  // Reconstruct one ray per physical pixel"),o=a.indexOf("  var traceAux=",i);if(i<0||o<0||!a.includes("struct VisibilitySurface{")||!a.includes("fn valleySculptNormal(")||a.includes("fn terrainMeshVertex("))throw Error("Valley terrain mesh requires sculpted deferred geometry");let t=a.slice(i,o);if(p){const n=t.indexOf("  var bandNear=");if(n<0)throw Error("Missing mesh bend interval");t=t.slice(0,n)+`
  let normalPoint=(ro+rd*in.distance).xz;
  let normalTile=valleySculptRef(valleySculptTile(normalPoint,rd.xz));
  let sharedTop=meshGroundNormal(normalPoint,rd.xz,normalTile,in.face);
`+t.slice(n)}const l=e||p?`
fn meshCornerHeights(tileRef:u32,cell:vec2i)->vec4f {
  return vec4f(valleySculptNode(tileRef,cell).x,valleySculptNode(tileRef,cell+vec2i(1,0)).x,
               valleySculptNode(tileRef,cell+vec2i(0,1)).x,valleySculptNode(tileRef,cell+vec2i(1,1)).x);
}
fn meshGroundNormal(point:vec2f,direction:vec2f,tileRef:u32${p?",face:u32":""})->vec3f {
  ${p?`var shaped=false;
  if(face==0u){shaped=(valleyGroundData[tileRef+4u]&256u)==0u;}
  let anyShaped=subgroupAny(shaped);`:""}
  let tile=valleySculptTile(point,direction);
  let local=clamp(point-valleyGroundLow()-vec2f(tile),vec2f(0),vec2f(1));
  let cell=valleySculptCell(local,direction,15.);
  let uv=local*15.-vec2f(cell);
  var h:vec4f;
  ${p?`// Repeated uses of the same sculpt template may occur on different world tiles.
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
`:"")+(p?`enable subgroups;
`:"")+a+l+`
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
${t}
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
  ${p?"if(in.face==0u){n=sharedTop;}":`if(in.face==0u){
    let at=valleySculptRef(valleySculptTile(hit.xz,rd.xz));
    if((valleyGroundData[at+4u]&256u)==0u){
      n=${e?"meshGroundNormal(hit.xz,rd.xz,at)":"valleySculptNormal(valleySculptPatch(hit.xz,rd.xz))"};
    }
  }`}
  return VisibilitySurface(t/depthScale,vec4f(n,t),${b?"vec2u((atlasBank<<24u)|(in.id+1u),bitcast<u32>(t))":"(atlasBank<<24u)|(in.id+1u)"});
}
`}const oe={arrayStride:24,stepMode:"vertex",attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]},re="@vertex fn vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Vertex{",he="@fragment fn fragment(in:Vertex)->VisibilitySurface{";function ke(a,e){const p=a.indexOf(he),b=a.indexOf("  var traceAux=",p);if(p<0||b<0)throw Error("Unknown Valley terrain chunk bounds fragment layout");const i=p+he.length;let o=i,t=1;for(;o<a.length&&t;)a[o]==="{"?t++:a[o]==="}"&&t--,o++;if(t||b>=o)throw Error("Unknown Valley terrain chunk bounds fragment layout");let l=a.slice(b,o);const n="valleyGroundRayRange(ro+vec3f(0,1,0),rd,bandNear,bandFar,shadowPass)",d=l.includes(n)?n:"valleyGroundRay(ro+vec3f(0,1,0),rd,bandFar)",k=e==="both"&&d===n;if(e){const f=`    let valleyHit=${d};`,w=l.indexOf(f);if(w<0||l.indexOf(f,w+f.length)>=0)throw Error("Unknown Valley terrain chunk ray layout");const x=d.replace("bandFar","chunkTraceFar");l=l.replace(f,k?`    var valleyHit:ValleyGroundHit;
    if(chunkTraceNear>=0.){
      valleyHit=valleyGroundTrace(ro+vec3f(0,1,0),rd,chunkTraceNear,chunkTraceFar,chunkTraceNear==0.,valleyGroundTop());
    }else{
      valleyHit=${x};
    }`:`    let valleyHit=${x};`)}return`
@fragment fn chunkBoundsFragment(chunk:ValleyChunkVertex)->VisibilitySurface{
  let in=Vertex(chunk.pos,chunk.uv,chunk.id);${a.slice(i,b)}${e?`  var chunkTraceFar=bandFar;
`:""}${k?`  var chunkTraceNear=-1.;
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
${k?`        chunkTraceNear=max(bandNear,near-.0003);
`:""}      }
    }
`:""}  }
${l}
`}function we(a,e=!1,p=!1,b){const i=a.indexOf(re);if(i<0||a.indexOf(re,i+re.length)>=0||a.includes("fn valleyTerrainChunkBoundsVertex("))throw Error("Unknown Valley terrain chunk bounds vertex layout");return a.slice(0,i)+"fn valleyTerrainOriginalVertex(v:u32,i:u32)->Vertex{"+a.slice(i+re.length)+`
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
  @location(0) lo:vec3f,@location(1) hi:vec3f,${p?"@location(2) strip:u32,":""}
)->ValleyChunkVertex{
  ${e?`let i=${p?"strip":"v/4u"}; let corner=v%4u; let original=valleyTerrainOriginalVertex(select(corner,5u,corner==3u),i);`:"let original=valleyTerrainOriginalVertex(v%6u,i);"}
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
${ke(a,b)}
`}const Z=16,se=6,xe=se*4,pe=512,ie="@vertex fn vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Vertex{",J=.04,Me={arrayStride:xe,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x4"},{shaderLocation:1,offset:16,format:"uint32"}]};function ze(a){const e=a.indexOf(ie);if(e<0||a.indexOf(ie,e+ie.length)>=0||a.includes("fn valleyTerrainColumnVertex("))throw Error("Unknown Valley terrain column vertex layout");return a.slice(0,e)+"fn valleyTerrainColumnOriginal(v:u32,i:u32)->Vertex{"+a.slice(e+ie.length)+`
@vertex fn valleyTerrainColumnVertex(@builtin(vertex_index) v:u32,@location(0) rect:vec4f,@location(1) id:u32)->Vertex{
  let original=valleyTerrainColumnOriginal(v,id);
  let p=clamp(original.pos.xy,rect.xy,rect.zw);
  return Vertex(vec4f(p,original.pos.zw),p,id);
}
`}function le(a,e,p,b,i,o,t){const{min:l,max:n}=a,c=(l[0]+n[0])*.5,d=(l[2]+n[2])*.5,k=(n[0]-l[0])*.5+J,f=(n[2]-l[2])*.5+J,w=e[76],x=e[77],r=w*c+x*d+e[78],F=Math.abs(w)*k+Math.abs(x)*f+J,g=Math.max(r-F,i),m=Math.min(r+F,o);if(g>m)return 0;const U=c-e[12],R=d-e[14],V=e[98];if(V>0){const G=Math.max(0,Math.abs(U)-k),X=Math.max(0,Math.abs(R)-f);if(G*G+X*X>(V+J)**2)return 0}const O=(l[1]+n[1])*.5+p*(g+m)*.5+b-e[13],B=(n[1]-l[1])*.5+Math.abs(p)*(m-g)*.5+J,L=-e[11],T=L/e[3],j=L/e[7],$=L-e[8]*U-e[9]*O-e[10]*R,s=Math.abs(e[8])*k+Math.abs(e[9])*B+Math.abs(e[10])*f+J,u=$-s,h=$+s;if(h<0||u>256+J)return 0;const C=(e[0]*U+e[1]*O+e[2]*R)*T,S=(e[4]*U+e[5]*O+e[6]*R)*j,y=(Math.abs(e[0])*k+Math.abs(e[1])*B+Math.abs(e[2])*f+J)*T,M=(Math.abs(e[4])*k+Math.abs(e[5])*B+Math.abs(e[6])*f+J)*j;if(Math.abs(C)>y+h||Math.abs(S)>M+h)return 0;if(u<=.05)return-1;const v=2/e[96]+5e-5,z=2/e[97]+5e-5,N=C-y,A=S-M,Y=C+y,I=S+M;return t[0]=N/(N>=0?h:u)-v,t[1]=A/(A>=0?h:u)-z,t[2]=Y/(Y>=0?u:h)+v,t[3]=I/(I>=0?u:h)+z,1}function Ve(a){const e=new ArrayBuffer(pe*Z*xe),p=a.createBuffer({label:"Valley terrain screen columns",size:e.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),b=new Float32Array(e),i=new Uint32Array(e),o=new Float64Array(Z),t=new Float64Array(Z),l=new Float64Array(4);let n=0;function c(f,w,x,r,F){b[n]=f,b[n+1]=w,b[n+2]=x,b[n+3]=r,i[n+4]=F,n+=se}function d(){const f=Math.max(0,Math.floor((l[0]+1)*Z*.5)),w=Math.min(Z-1,Math.floor((l[2]+1)*Z*.5));for(let x=f;x<=w;x++)o[x]=Math.min(o[x],l[1]),t[x]=Math.max(t[x],l[3])}function k(f,w,x,r,F,g,m){const U=-r[11];if(g+m>pe||!(U>=1&&U<=256&&r[96]>=1&&r[97]>=1&&r[3]>0&&r[7]>0&&U/r[3]<=16&&U/r[7]<=16))return!1;const R=r[12]+r[8]*U,V=r[13]+r[9]*U,O=r[14]+r[10]*U,B=r[76]*R+r[77]*O+r[78],L=x.chunks,T=x.nodes,j=g*Z*se;n=j;for(let $=g;$<g+m;$++){const s=$*40;if((F[s+38]&2)===0)continue;const u=F[s+3],h=F[s+7],C=F[s+36]-J,S=F[s+37]+J;if(!(C<=S&&Math.abs(u)<=8&&Math.abs(h)+Math.abs(r[78])+Math.abs(R)+Math.abs(V)+Math.abs(O)<4096))return!1;o.fill(2),t.fill(-2);let y=!1;for(let M=0;M<T.length&&!y;){const v=T[M];if(le(v,r,u,h,C,S,l)===0){M=v.skip;continue}if(v.skip===M+1)for(let z=v.start;z<v.end;z++){const N=le(L[z],r,u,h,C,S,l);if(N<0){y=!0;break}N>0&&d()}M++}if(!y&&x.bottom>=0&&V-(u*B+h)<=-1+J){const M=le(L[x.bottom],r,u,h,C,S,l);M<0&&(y=!0),M>0&&d()}if(y){c(-1,-1,1,1,$);continue}for(let M=0;M<Z;M++){const v=Math.max(-1,o[M]),z=Math.min(1,t[M]);v<z&&c(M*2/Z-1,v,(M+1)*2/Z-1,z,$)}}if(n!==j){const $=j*4,s=(n-j)*4;a.queue.writeBuffer(p,$,e,$,s),f.setPipeline(w),f.setVertexBuffer(0,p,$,s),f.draw(6,(n-j)/se)}return!0}return{vertexBuffer:p,draw:k}}const ae=6,ue=ae+1,ce=ue*Float32Array.BYTES_PER_ELEMENT,Se=8192;function Be(a,e,p){const b=Math.min(Se,Math.floor(a.limits.maxBufferSize/ce));if(b<1)throw Error("Device cannot allocate a packed terrain instance");const i=e.length,o=new Float32Array(i*ae);for(let k=0;k<i;k++){const{min:f,max:w}=e[k],x=k*ae;for(let r=0;r<3;r++)o[x+r]=f[r]-p,o[x+3+r]=w[r]+p}const t=new Float32Array(b*ue),l=new Uint32Array(t.buffer),n=a.createBuffer({label:"Valley packed terrain bounds",size:t.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});let c=0,d=0;return{vertexBuffer:n,beginFrame(){c=0,d=0},append(k,f,w){if(!Number.isInteger(k)||!Number.isInteger(f)||k<0||f<0||k+f>i||d+f>b||!Number.isInteger(w)||w<0||w>4294967295)return!1;let x=k*ae,r=d*ue;for(let F=0;F<f;F++){for(let g=0;g<ae;g++)t[r++]=o[x++];l[r++]=w}return d+=f,!0},draw(k){const f=d-c;if(!f)return;const w=c*ce;a.queue.writeBuffer(n,w,t.buffer,w,f*ce),k.setVertexBuffer(0,n),k.draw(4,f,0,c),c=d},cancel(){d=c},destroy(){n.destroy()}}}const de=40,q=.025;function me(a,e){const p=[];function b(i,o){const t={min:[1/0,1/0,1/0],max:[-1/0,-1/0,-1/0],start:i,end:o,skip:0};if(p.push(t),o-i>8){const l=Math.floor((i+o)*.5),n=b(i,l),c=b(l,o);for(let d=0;d<3;d++)t.min[d]=Math.min(n.min[d],c.min[d]),t.max[d]=Math.max(n.max[d],c.max[d])}else for(let l=i;l<o;l++){const n=a[l];for(let c=0;c<3;c++)t.min[c]=Math.min(t.min[c],n.min[c]),t.max[c]=Math.max(t.max[c],n.max[c])}return t.skip=p.length,t}return e>0&&b(0,e),p}function fe(a,e,p,b,i,o){const t=a.min,l=a.max,n=(t[0]+l[0])*.5,c=(t[2]+l[2])*.5,d=(l[0]-t[0])*.5,k=(l[2]-t[2])*.5,f=e[76]*n+e[77]*c+e[78],w=Math.abs(e[76])*d+Math.abs(e[77])*k+q,x=Math.max(f-w,i),r=Math.min(f+w,o);if(x>r)return!1;const F=n-e[12],g=c-e[14],m=e[98];if(m>0){const $=Math.max(0,Math.abs(F)-d),s=Math.max(0,Math.abs(g)-k);if($*$+s*s>(m+q)**2)return!1}const U=(t[1]+l[1])*.5+p*(x+r)*.5+b-e[13],R=(l[1]-t[1])*.5+Math.abs(p)*(r-x)*.5+q,V=-e[11]-e[8]*F-e[9]*U-e[10]*g,O=Math.abs(e[8])*d+Math.abs(e[9])*R+Math.abs(e[10])*k+q;if(V+O<0||V-O>256+q)return!1;const B=e[0]*F+e[1]*U+e[2]*g,L=Math.abs(e[0])*d+Math.abs(e[1])*R+Math.abs(e[2])*k+q;if(Math.abs(B)>L+(V+O)*e[3]/-e[11])return!1;const T=e[4]*F+e[5]*U+e[6]*g,j=Math.abs(e[4])*d+Math.abs(e[5])*R+Math.abs(e[6])*k+q;return Math.abs(T)<=j+(V+O)*e[7]/-e[11]}async function ne(a,e,p,b=0,i="mesh",o=!1,t=!0,l=ye){const n=i==="packed",c=i==="batched",d=n||c,k=i==="exitBounds"?"far":i==="rayWindow"?"both":void 0,f=i==="meshFill",w=i==="bounds"||i==="terraces"||!!k||d,x=i==="columns",r=i==="mesh"||f,F=d?1:6,g=`Valley terrain ${i} ${o?"gap repair":"visibility"}`,m=r&&t&&a.features.has("shader-f16"),U=r&&t&&a.features.has("subgroups"),R=a.createShaderModule({label:g,code:x?ze(p):w?we(p,d,n,k):ve(p,m,U,l.aux==="rgba16float")}),V={};b&&(V.atlasBank=b),!r&&be&&(V.coverageStats=0);const O={compare:"always",passOp:"replace"},B=await a.createRenderPipelineAsync({label:g,layout:e,primitive:{topology:d?"triangle-strip":"triangle-list"},vertex:{module:R,entryPoint:x?"valleyTerrainColumnVertex":w?"valleyTerrainChunkBoundsVertex":"terrainMeshVertex",buffers:[x?Me:n?{arrayStride:28,stepMode:"instance",attributes:[...oe.attributes,{shaderLocation:2,offset:24,format:"uint32"}]}:c?{...oe,stepMode:"instance"}:w?oe:ge],constants:r?void 0:{coverageMode:0}},fragment:{module:R,entryPoint:x?"fragment":w?"chunkBoundsFragment":"terrainMeshFragment",constants:V,targets:[{format:l.aux},{format:l.record}]},depthStencil:{format:f||o?"depth24plus-stencil8":"depth24plus",depthWriteEnabled:!0,depthCompare:"less",...o?{stencilFront:{compare:"equal"},stencilBack:{compare:"equal"},stencilReadMask:1,stencilWriteMask:0}:{},...f?{stencilFront:O,stencilBack:O,stencilReadMask:1,stencilWriteMask:1}:{}}}).catch(s=>{if(!m&&!U)throw s;console.warn("Using scalar terrain mesh normals",s)});if(!B)return ne(a,e,p,b,i,o,!1,l);const L=B;async function T(s){var G,X;const u=w?s.chunks.length*F*24:((G=s.vertices)==null?void 0:G.byteLength)??0,h=r?Math.ceil((((X=s.indices)==null?void 0:X.byteLength)??0)/4)*4:0;if(!s.chunks.length||w&&!u||r&&(!u||!h||u%16!==0)||Math.max(u,h)>a.limits.maxBufferSize)throw Error("Invalid Valley terrain mesh size");for(const P of s.chunks){for(let E=0;E<3;E++)if(!Number.isFinite(P.min[E])||!Number.isFinite(P.max[E])||P.min[E]>P.max[E])throw Error("Invalid Valley terrain chunk bounds");if(r&&!(Number.isInteger(P.firstIndex)&&Number.isInteger(P.indexCount)&&Number.isInteger(P.baseVertex)&&P.firstIndex>=0&&P.indexCount>0&&P.firstIndex+P.indexCount<=s.indices.length&&P.baseVertex>=0&&P.baseVertex<s.vertices.length/4))throw Error("Invalid Valley terrain mesh chunk")}const C=s.chunks.length-1,S=s.chunks[C],y=!r&&C>0&&S.min[1]===-1&&S.max[1]===-1&&(i==="terraces"||s.chunks.every(P=>S.min[0]<=P.min[0]&&S.min[2]<=P.min[2]&&S.max[0]>=P.max[0]&&S.max[2]>=P.max[2]))?C:-1,M=me(s.chunks,y<0?s.chunks.length:y);let v,z,N,A;a.pushErrorScope("out-of-memory"),a.pushErrorScope("validation");try{if(n)N=Be(a,s.chunks,q),v=N.vertexBuffer;else if(x)A=Ve(a),v=A.vertexBuffer;else{v=a.createBuffer({label:"Valley terrain vertices",size:u,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0});const P=new Float32Array(v.getMappedRange());if(w)for(let E=0;E<s.chunks.length;E++){const K=s.chunks[E];for(let Q=0;Q<F;Q++){const D=(E*F+Q)*6;for(let H=0;H<3;H++)P[D+H]=K.min[H]-q,P[D+3+H]=K.max[H]+q}}else P.set(s.vertices);v.unmap()}r&&(z=a.createBuffer({label:"Valley terrain indices",size:h,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0}),new Uint16Array(z.getMappedRange()).set(s.indices),z.unmap())}catch(P){throw v==null||v.destroy(),z==null||z.destroy(),await Promise.allSettled([a.popErrorScope(),a.popErrorScope()]),P}try{const E=(await Promise.all([a.popErrorScope(),a.popErrorScope()])).find(Boolean);if(E)throw Error(E.message)}catch(P){throw v.destroy(),z==null||z.destroy(),P}const Y=v,I=z;return{vertices:Y,indices:I,chunks:s.chunks,nodes:M,bottom:y,packed:N,columns:A,destroy(){Y.destroy(),I==null||I.destroy()}}}function j(s,u,h,C,S){return u.packed?u.packed.append(h,C,S)?!0:(u.packed.cancel(),!1):(c?s.draw(4,C,S*4,h):s.draw(C*6,1,h*6,S),!0)}function $(s,u,h,C,S,y){var z,N;if(!(h[3]>0&&h[7]>0&&h[11]<=-1&&h[79]>0&&y>0&&S>=0&&(S+y)*de<=C.length))return!1;const M=S+y;for(let A=S;A<M;A++)if(C[A*de+11]!==0)return!1;if(x)return((z=u.columns)==null?void 0:z.draw(s,L,u,h,C,S,y))??!1;n||(s.setPipeline(L),u.resident||s.setVertexBuffer(0,u.vertices)),u.indices&&s.setIndexBuffer(u.indices,"uint16");let v;for(let A=S;A<M;A++){const Y=A*de;if((C[Y+38]&2)===0)continue;const I=C[Y+3],G=C[Y+7],X=C[Y+36]-q,P=C[Y+37]+q;let E=-1;const K=u.chunks,Q=u.nodes;for(let D=0;D<Q.length;){const H=Q[D];if(!fe(H,h,I,G,X,P)){if(E>=0){if(!j(s,u,E,H.start-E,A))return!1;E=-1}D=H.skip;continue}if(c&&H.skip===D+1)E<0&&(E=H.start);else if(H.skip===D+1)for(let _=H.start;_<H.end;_++){const W=K[_],ee=fe(W,h,I,G,X,P);if(w){if(ee)E<0&&(E=_);else if(E>=0){if(!j(s,u,E,_-E,A))return!1;E=-1}}else if(ee){const te=(N=u.resident)==null?void 0:N[_];te&&te.vertices!==v&&(s.setVertexBuffer(0,te.vertices),s.setIndexBuffer(te.indices,"uint16"),v=te.vertices),s.drawIndexed(W.indexCount,1,W.firstIndex,W.baseVertex,A)}}D++}if(E>=0){const D=(u.bottom<0?K.length:u.bottom)-E;if(!j(s,u,E,D,A))return!1}if(u.bottom>=0){const D=-h[11],H=h[12]+h[8]*D,_=h[14]+h[10]*D,W=H*h[76]+_*h[77]+h[78];if(h[13]+h[9]*D-(I*W+G)<=-1+q&&fe(K[u.bottom],h,I,G,X,P)&&!j(s,u,u.bottom,1,A))return!1}}return u.packed&&(s.setPipeline(L),u.packed.draw(s)),!0}return{upload:T,draw:$,normalMode:m?U?"halfShared":"half":U?"shared":"original"}}const Ce=32,Te=512*1024;function Pe(a,{chunk:e,vertices:p,indices:b}){const{firstIndex:i,indexCount:o,baseVertex:t}=e,l=Math.ceil(b.byteLength/4)*4;if(p.byteLength%16!==0||Math.max(p.byteLength,l)>a.limits.maxBufferSize||i===void 0||!Number.isInteger(i)||i<0||o===void 0||!Number.isInteger(o)||o<=0||i+o>b.length||t===void 0||!Number.isInteger(t)||t<0||t>=p.length/4)throw Error("Invalid resident Valley terrain mesh chunk");for(let n=0;n<3;n++)if(!Number.isFinite(e.min[n])||!Number.isFinite(e.max[n])||e.min[n]>e.max[n])throw Error("Invalid resident Valley terrain chunk bounds")}function Ee(a,e,p,b){let i,o;try{i=a.createBuffer({label:"Valley resident terrain page vertices",size:p,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),o=a.createBuffer({label:"Valley resident terrain page indices",size:Math.ceil(b/2)*4,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0});const t=new Float32Array(i.getMappedRange()),l=new Uint16Array(o.getMappedRange());let n=0,c=0;for(const d of e)t.set(d.vertices,n),l.set(d.indices,c),n+=d.vertices.length,c+=d.indices.length;return i.unmap(),o.unmap(),{vertices:i,indices:o,references:0}}catch(t){throw i==null||i.destroy(),o==null||o.destroy(),t}}function Fe(a){let e=new Map,p=new Set;const b=new Set;let i=0,o=!1;function t(c){b.delete(c)&&(c.vertices.destroy(),c.indices.destroy())}function l(c){--c.references===0&&t(c)}async function n(c){if(o)return;const d=++i,k=new Set(c.keys);if(k.size!==c.keys.length)throw Error("Duplicate resident Valley terrain chunk keys");const f=new Map;for(const r of c.added){if(!k.has(r.key)||f.has(r.key))throw Error("Unexpected resident Valley terrain chunk upload");Pe(a,r),f.set(r.key,r)}for(const r of k)if(!e.has(r)&&!f.has(r))throw Error("Missing resident Valley terrain chunk");const w=new Map,x=[];try{if(f.size){a.pushErrorScope("out-of-memory"),a.pushErrorScope("validation");try{let j=function(){if(!$.length)return;const C=Ee(a,$,u,h);x.push(C),b.add(C);let S=0,y=0;for(const{key:M,chunk:v,vertices:z,indices:N}of $)w.set(M,{page:C,chunk:{...v,firstIndex:S+v.firstIndex,baseVertex:y+v.baseVertex}}),S+=N.length,y+=z.length/4;$.length=0,u=0,h=0};const $=[],s=Math.min(Te,a.limits.maxBufferSize);let u=0,h=0;for(const C of k){const S=f.get(C);S&&(($.length===Ce||u+S.vertices.byteLength+Math.ceil((h+S.indices.length)/2)*4>s)&&j(),$.push(S),u+=S.vertices.byteLength,h+=S.indices.length)}j()}catch(j){throw await Promise.allSettled([a.popErrorScope(),a.popErrorScope()]),j}const[B,L]=await Promise.all([a.popErrorScope(),a.popErrorScope()]);if(d!==i)return;const T=B??L;if(T)throw Error(T.message)}const r=new Map;for(const B of k)r.set(B,w.get(B)??e.get(B));const F=Array.from(r.values()),g=F.map(B=>B.page),m=F.map(B=>B.chunk),U=me(m,m.length),R=new Set(g);let V=0;for(const B of R)B.references+=2,V+=B.vertices.size+B.indices.size;for(const B of p)l(B);if(e=r,p=R,x.length=0,!g.length)return;let O=!1;return{vertices:g[0].vertices,chunks:m,nodes:U,bottom:-1,resident:g,residentBytes:V,destroy(){if(!O){O=!0;for(const B of R)l(B)}}}}catch(r){if(d!==i)return;throw r}finally{for(const r of x)t(r)}}return{update:n,destroy(){if(!o){o=!0,i++;for(const c of p)l(c);e.clear();for(const c of b)t(c)}}}}function Re(a,e,p){const{reusePieces:b,reuseFlatChunks:i}=p,o=Fe(a);let t,l=[],n=0,c=Promise.resolve(),d;async function k(f,w,x){var B;if(x!==n)return;t||(t=new Worker(new URL("/Fable-Crown-Game/whispers-preview/distance-test/assets/valley-terrain-surface.worker-BYpzbXDA.js",import.meta.url),{type:"module"}),l=[]);const r=t,F=await new Promise((L,T)=>{d=()=>L(void 0),r.onmessage=j=>L(j.data),r.onerror=j=>{r.terminate(),t=void 0,T(Error(j.message))},r.postMessage({mode:"world",ground:{data:f.data,size:f.size,low:f.low,worldLow:f.worldLow},edges:[0,1,2,3].map(j=>!!(w&1<<j)),boundedRepair:!!e,reusePieces:b,reuseFlatChunks:i,known:l})}).finally(()=>{d=void 0,r.onmessage=r.onerror=null});if(!F||x!==n)return;if(F.error)throw Error(F.error);const{delta:g,bakeMs:m}=F,U=performance.now(),R=await o.update(g);if(l=g.keys,!R||x!==n){R==null||R.destroy();return}let V;if(e&&((B=g.repairChunks)!=null&&B.length))try{V=await e.upload({chunks:g.repairChunks})}catch(L){console.warn("Using full terrain gap repair",L)}if(x!==n){R.destroy(),V==null||V.destroy();return}const O=g.added.reduce((L,T)=>L+T.vertices.byteLength+T.indices.byteLength,0);return{mesh:R,repair:V,stats:{chunks:R.chunks.length,triangles:R.chunks.reduce((L,T)=>L+T.indexCount/3,0),bytes:R.residentBytes+((V==null?void 0:V.vertices.size)??0),uploadedBytes:O,repairBytes:(V==null?void 0:V.vertices.size)??0,rebuilt:g.rebuilt,reused:g.reused,total:g.total,bakeMs:m,uploadMs:performance.now()-U,maxHeightError:g.maxHeightError,reusePieces:b,pieceBuilds:g.pieceBuilds,pieceReuses:g.pieceReuses,pieceLookups:g.pieceLookups,flatChunkHits:g.flatChunkHits}}}return{update(f,w){const x=++n,r=c.then(()=>k(f,w,x));return c=r.then(()=>{},()=>{}),r},destroy(){n++,d==null||d(),t==null||t.terminate(),t=void 0,o.destroy()}}}async function Ue(a,e,p,b,i,o,t,l,n,c=ye){const d=l!==void 0;let k=!1;const f=await ne(a,e,p,i,o,!1,!0,c),w=o==="mesh"||o==="meshFill";w&&(t.dataset.terrainNormals=f.normalMode);const x=b&&!w?await ne(a,e,b,i,o,!1,!0,c):f,r=d?await ne(a,e,p,i,"bounds",!0,!0,c):void 0,F=r&&b?await ne(a,e,b,i,"bounds",!0,!0,c):r,g=n?Re(a,r,n):void 0;let m,U=!1,R=!1,V,O,B=-1,L,T,j,$,s=0;function u(){s++,L==null||L.terminate(),L=void 0,T==null||T.destroy(),T=void 0,V==null||V.destroy(),V=void 0,d&&(t.dataset.terrainRepairBounds="preparing")}function h(y){t.dataset.terrainSurface="fallback",console.warn("Terrain surface trial fell back to SDF",y)}function C(){var y,M,v;(y=m==null?void 0:m.result)==null||y.mesh.destroy(),(v=(M=m==null?void 0:m.result)==null?void 0:M.repair)==null||v.destroy(),m=void 0}function S(y,M){if(!g||(U=!0,y===O&&M===B||(m==null?void 0:m.ground)===y&&m.edges===M))return;C();const v={ground:y,edges:M};m=v,g.update(y,M).then(z=>{var N;if(m!==v){z==null||z.mesh.destroy(),(N=z==null?void 0:z.repair)==null||N.destroy();return}z?v.result=z:v.failed={reason:"No terrain mesh was prepared"}}).catch(z=>{m===v&&(v.failed={reason:z})})}return{stage:S,discard(y){(m==null?void 0:m.ground)===y&&y!==O&&C()},submitted(){U&&(R=!0)},get ready(){return!!T},frame(y,M,v,z){var Y;j=M,$=v,k=l==="bounds"||l==="wide"&&z>=70,(Y=T==null?void 0:T.packed)==null||Y.beginFrame();const N=M[136]+2*M[137]+4*M[138]+8*M[139];if(U){if((y!==O||N!==B)&&(S(y,N),u(),O=y,B=N,R=!1,t.dataset.terrainSurface="preparing"),(m==null?void 0:m.ground)===y&&m.edges===N)if(m.result){const{mesh:I,repair:G,stats:X}=m.result;m=void 0,T=I,V=G,t.dataset.terrainSurfaceStats=JSON.stringify({...X,prestaged:!R}),t.dataset.terrainSurface="ready"}else m.failed&&(h(m.failed.reason),m=void 0);return}if(y===O&&N===B)return;u(),O=y,B=N;const A=s;if(t.dataset.terrainSurface="preparing",g){g.update(y,N).then(I=>{var G;if(I){if(A!==s){I.mesh.destroy(),(G=I.repair)==null||G.destroy();return}T=I.mesh,V=I.repair,t.dataset.terrainSurfaceStats=JSON.stringify(I.stats),t.dataset.terrainSurface="ready"}}).catch(I=>{A===s&&h(I)});return}try{const I=new Worker(new URL("/Fable-Crown-Game/whispers-preview/distance-test/assets/valley-terrain-surface.worker-BYpzbXDA.js",import.meta.url),{type:"module"});L=I,I.onerror=G=>{A===s&&(I.terminate(),L=void 0,h(G.message))},I.onmessage=async G=>{var K,Q,D;if(I.terminate(),A!==s)return;L=void 0;const{mesh:X,bakeMs:P,error:E}=G.data;if(!X||E){h(E);return}try{const H=performance.now(),_=await f.upload(X);if(A!==s){_.destroy();return}let W;if(r&&G.data.repairChunks)try{W=await r.upload({chunks:G.data.repairChunks})}catch(ee){console.warn("Using full terrain gap repair",ee)}if(A!==s){_.destroy(),W==null||W.destroy();return}T=_,V=W,t.dataset.terrainSurfaceStats=JSON.stringify({chunks:X.chunks.length,triangles:(((K=X.indices)==null?void 0:K.length)??0)/3,bytes:_.vertices.size+(((Q=_.indices)==null?void 0:Q.size)??0)+((W==null?void 0:W.vertices.size)??0),uploadedBytes:_.vertices.size+(((D=_.indices)==null?void 0:D.size)??0),repairBytes:(W==null?void 0:W.vertices.size)??0,bakeMs:P,uploadMs:performance.now()-H,maxHeightError:X.maxHeightError}),t.dataset.terrainSurface="ready"}catch(H){A===s&&h(H)}},I.postMessage({ground:{data:y.data,size:y.size,low:y.low,worldLow:y.worldLow},edges:[0,1,2,3].map(G=>!!(N&1<<G)),boundedRepair:d,mode:w?"mesh":o==="packed"||o==="batched"?"batched":o==="terraces"?"terraces":"bounds"})}catch(I){h(I)}},draw(y,M,v,z){if(!T)return!1;const N=(z?x:f).draw(y,T,j,$,M,v);return N&&t.dataset.terrainSurface!=="active"&&(t.dataset.terrainSurface="active"),N},drawRepair(y,M,v){if(!d)return!1;if(!k)return t.dataset.terrainRepairBounds!=="broad"&&(t.dataset.terrainRepairBounds="broad"),!1;const z=v?F:r,N=!!z&&!!V&&z.draw(y,V,j,$,0,M),A=N?"active":"fallback";return t.dataset.terrainRepairBounds!==A&&(t.dataset.terrainRepairBounds=A),N},destroy(){u(),C(),g==null||g.destroy()}}}export{Ue as createTerrainSurface};
