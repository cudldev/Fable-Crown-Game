import{D as ye}from"./PrivateValley-ShSyDvZD.js";import"./index-DR7bvGU7.js";import"./ActionCycle-CpBuvM8V.js";import"./three.module-Df_d6poP.js";import"./index-Dz_5Q61x.js";const xe={arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:"float32x4"}]};function me(r){const e=r.indexOf("  // Reconstruct one ray per physical pixel"),w=r.indexOf("  var traceAux=",e);if(e<0||w<0||!r.includes("struct VisibilitySurface{")||!r.includes("fn valleySculptNormal(")||r.includes("fn terrainMeshVertex("))throw Error("Valley terrain mesh requires sculpted deferred geometry");const M=r.slice(e,w);return r+`
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
${M}
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
  if(in.face==0u){
    let at=valleySculptRef(valleySculptTile(hit.xz,rd.xz));
    if((valleyGroundData[at+4u]&256u)==0u){
      n=valleySculptNormal(valleySculptPatch(hit.xz,rd.xz));
    }
  }
  return VisibilitySurface(t/depthScale,vec4f(n,t),(atlasBank<<24u)|(in.id+1u));
}
`}const ae={arrayStride:24,stepMode:"vertex",attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]},Q="@vertex fn vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Vertex{",de="@fragment fn fragment(in:Vertex)->VisibilitySurface{";function be(r,e){const w=r.indexOf(de),M=r.indexOf("  var traceAux=",w);if(w<0||M<0)throw Error("Unknown Valley terrain chunk bounds fragment layout");const l=w+de.length;let c=l,t=1;for(;c<r.length&&t;)r[c]==="{"?t++:r[c]==="}"&&t--,c++;if(t||M>=c)throw Error("Unknown Valley terrain chunk bounds fragment layout");let d=r.slice(M,c);const o="valleyGroundRayRange(ro+vec3f(0,1,0),rd,bandNear,bandFar,shadowPass)",p=d.includes(o)?o:"valleyGroundRay(ro+vec3f(0,1,0),rd,bandFar)",x=e==="both"&&p===o;if(e){const u=`    let valleyHit=${p};`,S=d.indexOf(u);if(S<0||d.indexOf(u,S+u.length)>=0)throw Error("Unknown Valley terrain chunk ray layout");const m=p.replace("bandFar","chunkTraceFar");d=d.replace(u,x?`    var valleyHit:ValleyGroundHit;
    if(chunkTraceNear>=0.){
      valleyHit=valleyGroundTrace(ro+vec3f(0,1,0),rd,chunkTraceNear,chunkTraceFar,chunkTraceNear==0.,valleyGroundTop());
    }else{
      valleyHit=${m};
    }`:`    let valleyHit=${m};`)}return`
@fragment fn chunkBoundsFragment(chunk:ValleyChunkVertex)->VisibilitySurface{
  let in=Vertex(chunk.pos,chunk.uv,chunk.id);${r.slice(l,M)}${e?`  var chunkTraceFar=bandFar;
`:""}${x?`  var chunkTraceNear=-1.;
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
${x?`        chunkTraceNear=max(bandNear,near-.0003);
`:""}      }
    }
`:""}  }
${d}
`}function ge(r,e=!1,w=!1,M){const l=r.indexOf(Q);if(l<0||r.indexOf(Q,l+Q.length)>=0||r.includes("fn valleyTerrainChunkBoundsVertex("))throw Error("Unknown Valley terrain chunk bounds vertex layout");return r.slice(0,l)+"fn valleyTerrainOriginalVertex(v:u32,i:u32)->Vertex{"+r.slice(l+Q.length)+`
${Q}
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
  @location(0) lo:vec3f,@location(1) hi:vec3f,${w?"@location(2) strip:u32,":""}
)->ValleyChunkVertex{
  ${e?`let i=${w?"strip":"v/4u"}; let corner=v%4u; let original=valleyTerrainOriginalVertex(select(corner,5u,corner==3u),i);`:"let original=valleyTerrainOriginalVertex(v%6u,i);"}
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
${be(r,M)}
`}const Y=16,ne=6,ue=ne*4,fe=512,te="@vertex fn vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Vertex{",H=.04,ve={arrayStride:ue,stepMode:"instance",attributes:[{shaderLocation:0,offset:0,format:"float32x4"},{shaderLocation:1,offset:16,format:"uint32"}]};function ke(r){const e=r.indexOf(te);if(e<0||r.indexOf(te,e+te.length)>=0||r.includes("fn valleyTerrainColumnVertex("))throw Error("Unknown Valley terrain column vertex layout");return r.slice(0,e)+"fn valleyTerrainColumnOriginal(v:u32,i:u32)->Vertex{"+r.slice(e+te.length)+`
@vertex fn valleyTerrainColumnVertex(@builtin(vertex_index) v:u32,@location(0) rect:vec4f,@location(1) id:u32)->Vertex{
  let original=valleyTerrainColumnOriginal(v,id);
  let p=clamp(original.pos.xy,rect.xy,rect.zw);
  return Vertex(vec4f(p,original.pos.zw),p,id);
}
`}function ie(r,e,w,M,l,c,t){const{min:d,max:o}=r,f=(d[0]+o[0])*.5,p=(d[2]+o[2])*.5,x=(o[0]-d[0])*.5+H,u=(o[2]-d[2])*.5+H,S=e[76],m=e[77],a=S*f+m*p+e[78],B=Math.abs(S)*x+Math.abs(m)*u+H,i=Math.max(a-B,l),A=Math.min(a+B,c);if(i>A)return 0;const j=f-e[12],C=p-e[14],T=e[98];if(T>0){const W=Math.max(0,Math.abs(j)-x),$=Math.max(0,Math.abs(C)-u);if(W*W+$*$>(T+H)**2)return 0}const U=(d[1]+o[1])*.5+w*(i+A)*.5+M-e[13],n=(o[1]-d[1])*.5+Math.abs(w)*(A-i)*.5+H,s=-e[11],g=s/e[3],z=s/e[7],b=s-e[8]*j-e[9]*U-e[10]*C,R=Math.abs(e[8])*x+Math.abs(e[9])*n+Math.abs(e[10])*u+H,L=b-R,F=b+R;if(F<0||L>256+H)return 0;const I=(e[0]*j+e[1]*U+e[2]*C)*g,h=(e[4]*j+e[5]*U+e[6]*C)*z,v=(Math.abs(e[0])*x+Math.abs(e[1])*n+Math.abs(e[2])*u+H)*g,k=(Math.abs(e[4])*x+Math.abs(e[5])*n+Math.abs(e[6])*u+H)*z;if(Math.abs(I)>v+F||Math.abs(h)>k+F)return 0;if(L<=.05)return-1;const V=2/e[96]+5e-5,P=2/e[97]+5e-5,N=I-v,E=h-k,y=I+v,O=h+k;return t[0]=N/(N>=0?F:L)-V,t[1]=E/(E>=0?F:L)-P,t[2]=y/(y>=0?L:F)+V,t[3]=O/(O>=0?L:F)+P,1}function we(r){const e=new ArrayBuffer(fe*Y*ue),w=r.createBuffer({label:"Valley terrain screen columns",size:e.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),M=new Float32Array(e),l=new Uint32Array(e),c=new Float64Array(Y),t=new Float64Array(Y),d=new Float64Array(4);let o=0;function f(u,S,m,a,B){M[o]=u,M[o+1]=S,M[o+2]=m,M[o+3]=a,l[o+4]=B,o+=ne}function p(){const u=Math.max(0,Math.floor((d[0]+1)*Y*.5)),S=Math.min(Y-1,Math.floor((d[2]+1)*Y*.5));for(let m=u;m<=S;m++)c[m]=Math.min(c[m],d[1]),t[m]=Math.max(t[m],d[3])}function x(u,S,m,a,B,i,A){const j=-a[11];if(i+A>fe||!(j>=1&&j<=256&&a[96]>=1&&a[97]>=1&&a[3]>0&&a[7]>0&&j/a[3]<=16&&j/a[7]<=16))return!1;const C=a[12]+a[8]*j,T=a[13]+a[9]*j,U=a[14]+a[10]*j,n=a[76]*C+a[77]*U+a[78],s=m.chunks,g=m.nodes,z=i*Y*ne;o=z;for(let b=i;b<i+A;b++){const R=b*40;if((B[R+38]&2)===0)continue;const L=B[R+3],F=B[R+7],I=B[R+36]-H,h=B[R+37]+H;if(!(I<=h&&Math.abs(L)<=8&&Math.abs(F)+Math.abs(a[78])+Math.abs(C)+Math.abs(T)+Math.abs(U)<4096))return!1;c.fill(2),t.fill(-2);let v=!1;for(let k=0;k<g.length&&!v;){const V=g[k];if(ie(V,a,L,F,I,h,d)===0){k=V.skip;continue}if(V.skip===k+1)for(let P=V.start;P<V.end;P++){const N=ie(s[P],a,L,F,I,h,d);if(N<0){v=!0;break}N>0&&p()}k++}if(!v&&m.bottom>=0&&T-(L*n+F)<=-1+H){const k=ie(s[m.bottom],a,L,F,I,h,d);k<0&&(v=!0),k>0&&p()}if(v){f(-1,-1,1,1,b);continue}for(let k=0;k<Y;k++){const V=Math.max(-1,c[k]),P=Math.min(1,t[k]);V<P&&f(k*2/Y-1,V,(k+1)*2/Y-1,P,b)}}if(o!==z){const b=z*4,R=(o-z)*4;r.queue.writeBuffer(w,b,e,b,R),u.setPipeline(S),u.setVertexBuffer(0,w,b,R),u.draw(6,(o-z)/ne)}return!0}return{vertexBuffer:w,draw:x}}const ee=6,ce=ee+1,se=ce*Float32Array.BYTES_PER_ELEMENT,Me=8192;function Ve(r,e,w){const M=Math.min(Me,Math.floor(r.limits.maxBufferSize/se));if(M<1)throw Error("Device cannot allocate a packed terrain instance");const l=e.length,c=new Float32Array(l*ee);for(let x=0;x<l;x++){const{min:u,max:S}=e[x],m=x*ee;for(let a=0;a<3;a++)c[m+a]=u[a]-w,c[m+3+a]=S[a]+w}const t=new Float32Array(M*ce),d=new Uint32Array(t.buffer),o=r.createBuffer({label:"Valley packed terrain bounds",size:t.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});let f=0,p=0;return{vertexBuffer:o,beginFrame(){f=0,p=0},append(x,u,S){if(!Number.isInteger(x)||!Number.isInteger(u)||x<0||u<0||x+u>l||p+u>M||!Number.isInteger(S)||S<0||S>4294967295)return!1;let m=x*ee,a=p*ce;for(let B=0;B<u;B++){for(let i=0;i<ee;i++)t[a++]=c[m++];d[a++]=S}return p+=u,!0},draw(x){const u=p-f;if(!u)return;const S=f*se;r.queue.writeBuffer(o,S,t.buffer,S,u*se),x.setVertexBuffer(0,o),x.draw(4,u,0,f),f=p},cancel(){p=f},destroy(){o.destroy()}}}const oe=40,G=.025;function he(r,e){const w=[];function M(l,c){const t={min:[1/0,1/0,1/0],max:[-1/0,-1/0,-1/0],start:l,end:c,skip:0};if(w.push(t),c-l>8){const d=Math.floor((l+c)*.5),o=M(l,d),f=M(d,c);for(let p=0;p<3;p++)t.min[p]=Math.min(o.min[p],f.min[p]),t.max[p]=Math.max(o.max[p],f.max[p])}else for(let d=l;d<c;d++){const o=r[d];for(let f=0;f<3;f++)t.min[f]=Math.min(t.min[f],o.min[f]),t.max[f]=Math.max(t.max[f],o.max[f])}return t.skip=w.length,t}return e>0&&M(0,e),w}function le(r,e,w,M,l,c){const t=r.min,d=r.max,o=(t[0]+d[0])*.5,f=(t[2]+d[2])*.5,p=(d[0]-t[0])*.5,x=(d[2]-t[2])*.5,u=e[76]*o+e[77]*f+e[78],S=Math.abs(e[76])*p+Math.abs(e[77])*x+G,m=Math.max(u-S,l),a=Math.min(u+S,c);if(m>a)return!1;const B=o-e[12],i=f-e[14],A=e[98];if(A>0){const b=Math.max(0,Math.abs(B)-p),R=Math.max(0,Math.abs(i)-x);if(b*b+R*R>(A+G)**2)return!1}const j=(t[1]+d[1])*.5+w*(m+a)*.5+M-e[13],C=(d[1]-t[1])*.5+Math.abs(w)*(a-m)*.5+G,T=-e[11]-e[8]*B-e[9]*j-e[10]*i,U=Math.abs(e[8])*p+Math.abs(e[9])*C+Math.abs(e[10])*x+G;if(T+U<0||T-U>256+G)return!1;const n=e[0]*B+e[1]*j+e[2]*i,s=Math.abs(e[0])*p+Math.abs(e[1])*C+Math.abs(e[2])*x+G;if(Math.abs(n)>s+(T+U)*e[3]/-e[11])return!1;const g=e[4]*B+e[5]*j+e[6]*i,z=Math.abs(e[4])*p+Math.abs(e[5])*C+Math.abs(e[6])*x+G;return Math.abs(g)<=z+(T+U)*e[7]/-e[11]}async function re(r,e,w,M=0,l="mesh",c=!1){const t=l==="packed",d=l==="batched",o=t||d,f=l==="exitBounds"?"far":l==="rayWindow"?"both":void 0,p=l==="meshFill",x=l==="bounds"||l==="terraces"||!!f||o,u=l==="columns",S=l==="mesh"||p,m=o?1:6,a=`Valley terrain ${l} ${c?"gap repair":"visibility"}`,B=r.createShaderModule({label:a,code:u?ke(w):x?ge(w,o,t,f):me(w)}),i={};M&&(i.atlasBank=M),!S&&ye&&(i.coverageStats=0);const A={compare:"always",passOp:"replace"},j=await r.createRenderPipelineAsync({label:a,layout:e,primitive:{topology:o?"triangle-strip":"triangle-list"},vertex:{module:B,entryPoint:u?"valleyTerrainColumnVertex":x?"valleyTerrainChunkBoundsVertex":"terrainMeshVertex",buffers:[u?ve:t?{arrayStride:28,stepMode:"instance",attributes:[...ae.attributes,{shaderLocation:2,offset:24,format:"uint32"}]}:d?{...ae,stepMode:"instance"}:x?ae:xe],constants:S?void 0:{coverageMode:0}},fragment:{module:B,entryPoint:u?"fragment":x?"chunkBoundsFragment":"terrainMeshFragment",constants:i,targets:[{format:"rgba32float"},{format:"r32uint"}]},depthStencil:{format:p||c?"depth24plus-stencil8":"depth24plus",depthWriteEnabled:!0,depthCompare:"less",...c?{stencilFront:{compare:"equal"},stencilBack:{compare:"equal"},stencilReadMask:1,stencilWriteMask:0}:{},...p?{stencilFront:A,stencilBack:A,stencilReadMask:1,stencilWriteMask:1}:{}}});async function C(n){var P,N;const s=x?n.chunks.length*m*24:((P=n.vertices)==null?void 0:P.byteLength)??0,g=S?Math.ceil((((N=n.indices)==null?void 0:N.byteLength)??0)/4)*4:0;if(!n.chunks.length||x&&!s||S&&(!s||!g||s%16!==0)||Math.max(s,g)>r.limits.maxBufferSize)throw Error("Invalid Valley terrain mesh size");for(const E of n.chunks){for(let y=0;y<3;y++)if(!Number.isFinite(E.min[y])||!Number.isFinite(E.max[y])||E.min[y]>E.max[y])throw Error("Invalid Valley terrain chunk bounds");if(S&&!(Number.isInteger(E.firstIndex)&&Number.isInteger(E.indexCount)&&Number.isInteger(E.baseVertex)&&E.firstIndex>=0&&E.indexCount>0&&E.firstIndex+E.indexCount<=n.indices.length&&E.baseVertex>=0&&E.baseVertex<n.vertices.length/4))throw Error("Invalid Valley terrain mesh chunk")}const z=n.chunks.length-1,b=n.chunks[z],R=!S&&z>0&&b.min[1]===-1&&b.max[1]===-1&&(l==="terraces"||n.chunks.every(E=>b.min[0]<=E.min[0]&&b.min[2]<=E.min[2]&&b.max[0]>=E.max[0]&&b.max[2]>=E.max[2]))?z:-1,L=he(n.chunks,R<0?n.chunks.length:R);let F,I,h,v;r.pushErrorScope("out-of-memory"),r.pushErrorScope("validation");try{if(t)h=Ve(r,n.chunks,G),F=h.vertexBuffer;else if(u)v=we(r),F=v.vertexBuffer;else{F=r.createBuffer({label:"Valley terrain vertices",size:s,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0});const E=new Float32Array(F.getMappedRange());if(x)for(let y=0;y<n.chunks.length;y++){const O=n.chunks[y];for(let W=0;W<m;W++){const $=(y*m+W)*6;for(let D=0;D<3;D++)E[$+D]=O.min[D]-G,E[$+3+D]=O.max[D]+G}}else E.set(n.vertices);F.unmap()}S&&(I=r.createBuffer({label:"Valley terrain indices",size:g,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0}),new Uint16Array(I.getMappedRange()).set(n.indices),I.unmap())}catch(E){throw F==null||F.destroy(),I==null||I.destroy(),await Promise.allSettled([r.popErrorScope(),r.popErrorScope()]),E}try{const y=(await Promise.all([r.popErrorScope(),r.popErrorScope()])).find(Boolean);if(y)throw Error(y.message)}catch(E){throw F.destroy(),I==null||I.destroy(),E}const k=F,V=I;return{vertices:k,indices:V,chunks:n.chunks,nodes:L,bottom:R,packed:h,columns:v,destroy(){k.destroy(),V==null||V.destroy()}}}function T(n,s,g,z,b){return s.packed?s.packed.append(g,z,b)?!0:(s.packed.cancel(),!1):(d?n.draw(4,z,b*4,g):n.draw(z*6,1,g*6,b),!0)}function U(n,s,g,z,b,R){var I,h;if(!(g[3]>0&&g[7]>0&&g[11]<=-1&&g[79]>0&&R>0&&b>=0&&(b+R)*oe<=z.length))return!1;const L=b+R;for(let v=b;v<L;v++)if(z[v*oe+11]!==0)return!1;if(u)return((I=s.columns)==null?void 0:I.draw(n,j,s,g,z,b,R))??!1;t||(n.setPipeline(j),s.resident||n.setVertexBuffer(0,s.vertices)),s.indices&&n.setIndexBuffer(s.indices,"uint16");let F;for(let v=b;v<L;v++){const k=v*oe;if((z[k+38]&2)===0)continue;const V=z[k+3],P=z[k+7],N=z[k+36]-G,E=z[k+37]+G;let y=-1;const O=s.chunks,W=s.nodes;for(let $=0;$<W.length;){const D=W[$];if(!le(D,g,V,P,N,E)){if(y>=0){if(!T(n,s,y,D.start-y,v))return!1;y=-1}$=D.skip;continue}if(d&&D.skip===$+1)y<0&&(y=D.start);else if(D.skip===$+1)for(let X=D.start;X<D.end;X++){const q=O[X],K=le(q,g,V,P,N,E);if(x){if(K)y<0&&(y=X);else if(y>=0){if(!T(n,s,y,X-y,v))return!1;y=-1}}else if(K){const J=(h=s.resident)==null?void 0:h[X];J&&J.vertices!==F&&(n.setVertexBuffer(0,J.vertices),n.setIndexBuffer(J.indices,"uint16"),F=J.vertices),n.drawIndexed(q.indexCount,1,q.firstIndex,q.baseVertex,v)}}$++}if(y>=0){const $=(s.bottom<0?O.length:s.bottom)-y;if(!T(n,s,y,$,v))return!1}if(s.bottom>=0){const $=-g[11],D=g[12]+g[8]*$,X=g[14]+g[10]*$,q=D*g[76]+X*g[77]+g[78];if(g[13]+g[9]*$-(V*q+P)<=-1+G&&le(O[s.bottom],g,V,P,N,E)&&!T(n,s,s.bottom,1,v))return!1}}return s.packed&&(n.setPipeline(j),s.packed.draw(n)),!0}return{upload:C,draw:U}}const ze=32,Se=512*1024;function Be(r,{chunk:e,vertices:w,indices:M}){const{firstIndex:l,indexCount:c,baseVertex:t}=e,d=Math.ceil(M.byteLength/4)*4;if(w.byteLength%16!==0||Math.max(w.byteLength,d)>r.limits.maxBufferSize||l===void 0||!Number.isInteger(l)||l<0||c===void 0||!Number.isInteger(c)||c<=0||l+c>M.length||t===void 0||!Number.isInteger(t)||t<0||t>=w.length/4)throw Error("Invalid resident Valley terrain mesh chunk");for(let o=0;o<3;o++)if(!Number.isFinite(e.min[o])||!Number.isFinite(e.max[o])||e.min[o]>e.max[o])throw Error("Invalid resident Valley terrain chunk bounds")}function Ce(r,e,w,M){let l,c;try{l=r.createBuffer({label:"Valley resident terrain page vertices",size:w,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0}),c=r.createBuffer({label:"Valley resident terrain page indices",size:Math.ceil(M/2)*4,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0});const t=new Float32Array(l.getMappedRange()),d=new Uint16Array(c.getMappedRange());let o=0,f=0;for(const p of e)t.set(p.vertices,o),d.set(p.indices,f),o+=p.vertices.length,f+=p.indices.length;return l.unmap(),c.unmap(),{vertices:l,indices:c,references:0}}catch(t){throw l==null||l.destroy(),c==null||c.destroy(),t}}function Te(r){let e=new Map,w=new Set;const M=new Set;let l=0,c=!1;function t(f){M.delete(f)&&(f.vertices.destroy(),f.indices.destroy())}function d(f){--f.references===0&&t(f)}async function o(f){if(c)return;const p=++l,x=new Set(f.keys);if(x.size!==f.keys.length)throw Error("Duplicate resident Valley terrain chunk keys");const u=new Map;for(const a of f.added){if(!x.has(a.key)||u.has(a.key))throw Error("Unexpected resident Valley terrain chunk upload");Be(r,a),u.set(a.key,a)}for(const a of x)if(!e.has(a)&&!u.has(a))throw Error("Missing resident Valley terrain chunk");const S=new Map,m=[];try{if(u.size){r.pushErrorScope("out-of-memory"),r.pushErrorScope("validation");try{let z=function(){if(!b.length)return;const I=Ce(r,b,L,F);m.push(I),M.add(I);let h=0,v=0;for(const{key:k,chunk:V,vertices:P,indices:N}of b)S.set(k,{page:I,chunk:{...V,firstIndex:h+V.firstIndex,baseVertex:v+V.baseVertex}}),h+=N.length,v+=P.length/4;b.length=0,L=0,F=0};const b=[],R=Math.min(Se,r.limits.maxBufferSize);let L=0,F=0;for(const I of x){const h=u.get(I);h&&((b.length===ze||L+h.vertices.byteLength+Math.ceil((F+h.indices.length)/2)*4>R)&&z(),b.push(h),L+=h.vertices.byteLength,F+=h.indices.length)}z()}catch(z){throw await Promise.allSettled([r.popErrorScope(),r.popErrorScope()]),z}const[n,s]=await Promise.all([r.popErrorScope(),r.popErrorScope()]);if(p!==l)return;const g=n??s;if(g)throw Error(g.message)}const a=new Map;for(const n of x)a.set(n,S.get(n)??e.get(n));const B=Array.from(a.values()),i=B.map(n=>n.page),A=B.map(n=>n.chunk),j=he(A,A.length),C=new Set(i);let T=0;for(const n of C)n.references+=2,T+=n.vertices.size+n.indices.size;for(const n of w)d(n);if(e=a,w=C,m.length=0,!i.length)return;let U=!1;return{vertices:i[0].vertices,chunks:A,nodes:j,bottom:-1,resident:i,residentBytes:T,destroy(){if(!U){U=!0;for(const n of C)d(n)}}}}catch(a){if(p!==l)return;throw a}finally{for(const a of m)t(a)}}return{update:o,destroy(){if(!c){c=!0,l++;for(const f of w)d(f);e.clear();for(const f of M)t(f)}}}}function Pe(r,e,w){const{reusePieces:M,reuseFlatChunks:l}=w,c=Te(r);let t,d=[],o=0,f=Promise.resolve(),p;async function x(u,S,m){var n;if(m!==o)return;t||(t=new Worker(new URL("/Fable-Crown-Game/whispers-preview/assets/valley-terrain-surface.worker-BYpzbXDA.js",import.meta.url),{type:"module"}),d=[]);const a=t,B=await new Promise((s,g)=>{p=()=>s(void 0),a.onmessage=z=>s(z.data),a.onerror=z=>{a.terminate(),t=void 0,g(Error(z.message))},a.postMessage({mode:"world",ground:{data:u.data,size:u.size,low:u.low,worldLow:u.worldLow},edges:[0,1,2,3].map(z=>!!(S&1<<z)),boundedRepair:!!e,reusePieces:M,reuseFlatChunks:l,known:d})}).finally(()=>{p=void 0,a.onmessage=a.onerror=null});if(!B||m!==o)return;if(B.error)throw Error(B.error);const{delta:i,bakeMs:A}=B,j=performance.now(),C=await c.update(i);if(d=i.keys,!C||m!==o){C==null||C.destroy();return}let T;if(e&&((n=i.repairChunks)!=null&&n.length))try{T=await e.upload({chunks:i.repairChunks})}catch(s){console.warn("Using full terrain gap repair",s)}if(m!==o){C.destroy(),T==null||T.destroy();return}const U=i.added.reduce((s,g)=>s+g.vertices.byteLength+g.indices.byteLength,0);return{mesh:C,repair:T,stats:{chunks:C.chunks.length,triangles:C.chunks.reduce((s,g)=>s+g.indexCount/3,0),bytes:C.residentBytes+((T==null?void 0:T.vertices.size)??0),uploadedBytes:U,repairBytes:(T==null?void 0:T.vertices.size)??0,rebuilt:i.rebuilt,reused:i.reused,total:i.total,bakeMs:A,uploadMs:performance.now()-j,maxHeightError:i.maxHeightError,reusePieces:M,pieceBuilds:i.pieceBuilds,pieceReuses:i.pieceReuses,pieceLookups:i.pieceLookups,flatChunkHits:i.flatChunkHits}}}return{update(u,S){const m=++o,a=f.then(()=>x(u,S,m));return f=a.then(()=>{},()=>{}),a},destroy(){o++,p==null||p(),t==null||t.terminate(),t=void 0,c.destroy()}}}async function je(r,e,w,M,l,c,t,d,o){const f=d!==void 0;let p=!1;const x=await re(r,e,w,l,c),u=c==="mesh"||c==="meshFill",S=M&&!u?await re(r,e,M,l,c):x,m=f?await re(r,e,w,l,"bounds",!0):void 0,a=m&&M?await re(r,e,M,l,"bounds",!0):m,B=o?Pe(r,m,o):void 0;let i,A=!1,j=!1,C,T,U=-1,n,s,g,z,b=0;function R(){b++,n==null||n.terminate(),n=void 0,s==null||s.destroy(),s=void 0,C==null||C.destroy(),C=void 0,f&&(t.dataset.terrainRepairBounds="preparing")}function L(h){t.dataset.terrainSurface="fallback",console.warn("Terrain surface trial fell back to SDF",h)}function F(){var h,v,k;(h=i==null?void 0:i.result)==null||h.mesh.destroy(),(k=(v=i==null?void 0:i.result)==null?void 0:v.repair)==null||k.destroy(),i=void 0}function I(h,v){if(!B||(A=!0,h===T&&v===U||(i==null?void 0:i.ground)===h&&i.edges===v))return;F();const k={ground:h,edges:v};i=k,B.update(h,v).then(V=>{var P;if(i!==k){V==null||V.mesh.destroy(),(P=V==null?void 0:V.repair)==null||P.destroy();return}V?k.result=V:k.failed={reason:"No terrain mesh was prepared"}}).catch(V=>{i===k&&(k.failed={reason:V})})}return{stage:I,discard(h){(i==null?void 0:i.ground)===h&&h!==T&&F()},submitted(){A&&(j=!0)},get ready(){return!!s},frame(h,v,k,V){var E;g=v,z=k,p=d==="bounds"||d==="wide"&&V>=70,(E=s==null?void 0:s.packed)==null||E.beginFrame();const P=v[136]+2*v[137]+4*v[138]+8*v[139];if(A){if((h!==T||P!==U)&&(I(h,P),R(),T=h,U=P,j=!1,t.dataset.terrainSurface="preparing"),(i==null?void 0:i.ground)===h&&i.edges===P)if(i.result){const{mesh:y,repair:O,stats:W}=i.result;i=void 0,s=y,C=O,t.dataset.terrainSurfaceStats=JSON.stringify({...W,prestaged:!j}),t.dataset.terrainSurface="ready"}else i.failed&&(L(i.failed.reason),i=void 0);return}if(h===T&&P===U)return;R(),T=h,U=P;const N=b;if(t.dataset.terrainSurface="preparing",B){B.update(h,P).then(y=>{var O;if(y){if(N!==b){y.mesh.destroy(),(O=y.repair)==null||O.destroy();return}s=y.mesh,C=y.repair,t.dataset.terrainSurfaceStats=JSON.stringify(y.stats),t.dataset.terrainSurface="ready"}}).catch(y=>{N===b&&L(y)});return}try{const y=new Worker(new URL("/Fable-Crown-Game/whispers-preview/assets/valley-terrain-surface.worker-BYpzbXDA.js",import.meta.url),{type:"module"});n=y,y.onerror=O=>{N===b&&(y.terminate(),n=void 0,L(O.message))},y.onmessage=async O=>{var X,q,K;if(y.terminate(),N!==b)return;n=void 0;const{mesh:W,bakeMs:$,error:D}=O.data;if(!W||D){L(D);return}try{const J=performance.now(),Z=await x.upload(W);if(N!==b){Z.destroy();return}let _;if(m&&O.data.repairChunks)try{_=await m.upload({chunks:O.data.repairChunks})}catch(pe){console.warn("Using full terrain gap repair",pe)}if(N!==b){Z.destroy(),_==null||_.destroy();return}s=Z,C=_,t.dataset.terrainSurfaceStats=JSON.stringify({chunks:W.chunks.length,triangles:(((X=W.indices)==null?void 0:X.length)??0)/3,bytes:Z.vertices.size+(((q=Z.indices)==null?void 0:q.size)??0)+((_==null?void 0:_.vertices.size)??0),uploadedBytes:Z.vertices.size+(((K=Z.indices)==null?void 0:K.size)??0),repairBytes:(_==null?void 0:_.vertices.size)??0,bakeMs:$,uploadMs:performance.now()-J,maxHeightError:W.maxHeightError}),t.dataset.terrainSurface="ready"}catch(J){N===b&&L(J)}},y.postMessage({ground:{data:h.data,size:h.size,low:h.low,worldLow:h.worldLow},edges:[0,1,2,3].map(O=>!!(P&1<<O)),boundedRepair:f,mode:u?"mesh":c==="packed"||c==="batched"?"batched":c==="terraces"?"terraces":"bounds"})}catch(y){L(y)}},draw(h,v,k,V){if(!s)return!1;const P=(V?S:x).draw(h,s,g,z,v,k);return P&&t.dataset.terrainSurface!=="active"&&(t.dataset.terrainSurface="active"),P},drawRepair(h,v,k){if(!f)return!1;if(!p)return t.dataset.terrainRepairBounds!=="broad"&&(t.dataset.terrainRepairBounds="broad"),!1;const V=k?a:m,P=!!V&&!!C&&V.draw(h,C,g,z,0,v),N=P?"active":"fallback";return t.dataset.terrainRepairBounds!==N&&(t.dataset.terrainRepairBounds=N),P},destroy(){R(),F(),B==null||B.destroy()}}}export{je as createTerrainSurface};
