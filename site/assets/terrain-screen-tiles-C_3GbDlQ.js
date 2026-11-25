import{b5 as we}from"./index-BH33QArr.js";import{d as be}from"./PrivateValley-BeAOlMjK.js";const pe={srcFactor:"one",dstFactor:"one",operation:"add"},q=[{format:"rgba32float"},{format:"r32uint"}],Re={format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"},Pe={r:0,g:0,b:0,a:0},$=`
@vertex fn ridgeScreen(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);
}`,Z="@group(2) @binding(0) var tileScore:texture_2d<f32>;",E=Z+`
@group(2) @binding(1) var sampleAux:texture_2d<f32>;
@group(2) @binding(2) var sampleID:texture_2d<u32>;`,Y="@group(2) @binding(3) var tileMask:texture_2d<f32>;";function ke(o,G){const x="let valleyHit=valleyGroundRayRange(ro+vec3f(0,1,0),rd,bandNear,bandFar,shadowPass);";if(!o.includes(x))throw Error("Unknown terrain range query for depth-guided repair");return o.replace("let obj=items[in.id];","if(textureLoad(nativeID,vec2i(in.pos.xy),0).x!=0u){discard;}let obj=items[in.id];").replace(x,`var valleyHit=ValleyGroundHit(-1.,vec3f(0),0u);
    {
     let cell=vec2i(floor(in.pos.xy/8.-.5));
     let size=vec2i(textureDimensions(sampleID));
     let record=(atlasBank<<24u)|(in.id+1u);
     var nearest=256.;var farthest=0.;
     for(var i=0u;i<4u;i++){
      let q=cell+vec2i(vec2u(i%2u,i/2u));
      if(any(q<vec2i(0))||any(q>=size)){continue;}
      if(textureLoad(sampleID,q,0).x!=record){continue;}
      let depth=textureLoad(sampleAux,q,0).w;
      if(depth>0.&&depth<256.){nearest=min(nearest,depth);farthest=max(farthest,depth);}
     }
     let lower=max(max(.001,bandNear),nearest-1.5);
     let upper=min(min(bandFar,256.),farthest+1.5);
     if(farthest>0.&&upper>lower+.00004){
      ${G?`var retry=valleyVolumeRay(ro+vec3f(0,1,0),rd,lower,upper);
      if(retry.distance< -1.){retry=valleyGroundTrace(ro+vec3f(0,1,0),rd,lower,upper,true,valleyGroundTop());}`:"let retry=valleyGroundTrace(ro+vec3f(0,1,0),rd,lower,upper,true,valleyGroundTop());"}
      if(retry.distance>lower+.00002&&retry.distance<upper-.00002){valleyHit=retry;}
     }
    }`)}function Ae(o){const G=o.indexOf("@fragment fn fragment(in:Vertex)"),x=o.indexOf("let obj=items[in.id];",G),S=o.indexOf("var bandNear=0.;",x),P=o.indexOf("var t=0.;",S);if(G<0||x<0||S<0||P<0)throw Error("Unknown terrain camera ray");return{ray:o.slice(x,S),band:o.slice(S,P)}}async function Te(o,G,x,S,P,J,w){const{ray:F,band:K}=Ae(x),Q=Math.max(1,Math.min(6e4,w.cut)).toFixed(2),W=(e,t=e.map((i,s)=>s))=>o.createBindGroupLayout({entries:e.map((i,s)=>({binding:t[s],visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:i}}))}),ee=W(["unfilterable-float"]),te=W(["unfilterable-float","unfilterable-float","uint"]),re=W(["unfilterable-float","unfilterable-float","uint","unfilterable-float"]),C=w.mode==="repair"?W(["uint","unfilterable-float","uint"]):void 0,fe=[void 0,ee,te,re,C].map(e=>o.createPipelineLayout({bindGroupLayouts:e?[...G,e]:G})),T=(e,t,i,s,d,a=!1,f=!1,v)=>{const c=o.createShaderModule({label:e,code:t});return o.createRenderPipelineAsync({label:e,layout:fe[d],vertex:{module:c,entryPoint:a?"ridgeScreen":"vertex",constants:a?void 0:{coverageMode:J}},fragment:{module:c,entryPoint:i,targets:s,constants:v},depthStencil:f?Re:void 0})},I=(e,t)=>e.replaceAll("in.pos.x/",`(in.pos.x*${t}.)/`).replaceAll("in.pos.y/",`(in.pos.y*${t}.)/`),ie=[{format:"rgba16float",blend:{color:pe,alpha:pe}}],ae=e=>be(e).replace("atomicAdd(&coverageCounts[22u+u32(level)],1u);","").replace("if(angleRaised){atomicAdd(&coverageCounts[27u],1u);}",""),ne=async e=>T("Ridge tile prediction",ae(e)+`
 @fragment fn ridgeScore(in:Vertex)->@location(0) vec4f{
 ${I(F,8)}${K}
 let a=ro+vec3f(0,1,0);let inv=1./select(rd,vec3f(1e-8),abs(rd)<vec3f(1e-8));
 let low=valleyGroundLow();let high=low+valleyGroundSize();
 let ta=(vec3f(low.x,0,low.y)-a)*inv;let tb=(vec3f(high.x,valleyGroundTop(),high.y)-a)*inv;
 let near=min(ta,tb);let far=max(ta,tb);
 let t0=max(bandNear,max(near.x,max(near.y,near.z)));let t1=min(256.,min(bandFar,min(far.x,min(far.y,far.z))));
 let metres=max(0.,t1-t0)*length(rd.xz);
 let pixel=2.*view.up.w*max(1.,.5*(t0+t1))/max(1.,-view.back.w*view.viewport.y);
 let density=min(15.,1.5/max(.001,pixel));
 terrainWorkSampled=true;
 let hit=valleyGroundRayRange(ro+vec3f(0,1,0),rd,bandNear,bandFar,false);
 return vec4f(1.,1.+metres*density,f32(terrainWorkPatches),f32(hit.distance>=bandNear));
 }`,"ridgeScore",ie,0),V=w.mode==="audit",p=w.mode==="repair",_=p&&w.cullEmpty?await(await we(async()=>{const{createTerrainViewScan:e}=await import("./terrain-view-scan-2TX4Mg-A.js");return{createTerrainViewScan:e}},[])).createTerrainViewScan(o,G,x,S,P,J,w.canvas):void 0,R=w.mode==="progressive"||w.mode==="sky"||p,B=R?8:2,oe=8,j="vec2i(floor(pos.xy*.125-.5))",le=R?`(all(${j}>=vec2i(0))&&textureLoad(tileMask,${j},0).x>0.)`:"(textureLoad(tileMask,vec2i(pos.xy)/8,0).x>0.)";async function se(e){if(V){const m="  let end=min(exit,min(crossX,crossZ));";if(!e.includes(m))throw Error("Unknown detailed patch interval");const h=`var<private> measuredBandNear:f32;var<private> beforeBand:u32;
`+ae(e).replace(m,`  if(reference&&t<measuredBandNear){beforeBand++;}
`+m);return{score:await ne(e),work:await T("Ridge measured patches",h+`
    @fragment fn ridgeWork(in:Vertex)->@location(0) vec4f{
     ${I(F,2)}${K}
     terrainWorkSampled=true;measuredBandNear=bandNear;
     _ = valleyGroundRayRange(ro+vec3f(0,1,0),rd,bandNear,bandFar,false);
     // Scale additive half floats to cover the long-tail rays before readback.
     return vec4f(f32(terrainWorkPatches)/64.,f32(terrainWorkTiles)/64.,1.,f32(beforeBand)/64.);
    }`,"ridgeWork",ie,0)}}const t="let obj=items[in.id];",i="@fragment fn fragment(in:Vertex)->VisibilitySurface{";if(!e.includes(i))throw Error("Unknown terrain hit storage");const s=e.indexOf(i),d=e.slice(0,s),a=e.slice(s),f=R?I(a,B):I(a,B).replace(t,`if(textureLoad(tileScore,vec2i(in.pos.xy)/4,0).z<${Q}){discard;}
`+t),v=p?ke(a,e.includes("fn valleyVolumeRay(")):a.replace(t,`if${le.replaceAll("pos.xy","in.pos.xy")}{discard;}
`+t),[c,u]=await Promise.all([T(R?"Ridge 8x8 centers":"Ridge 2x2 centers",Z+d+f,"fragment",q,1,!1,!0,p&&!e.includes("fn valleyVolumeRay(")?{atlasBank:P,valleyMipFootprintScale:B}:{atlasBank:P}),T(p?"Ridge missing terrain repair":"Ridge full detail",(p?E.replace(Z,"@group(2) @binding(0) var nativeID:texture_2d<u32>;"):Y)+d+v,"fragment",q,p?4:3,!1,!0,{atlasBank:P})]);return{score:R?void 0:await ne(e),sample:c,fine:u}}const[ve,me]=await Promise.all([se(x),S?se(S):void 0]),de=V||p?void 0:R?await T("Ridge four sample agreement",x+$+E+`
 @fragment fn ridgeAccept(@builtin(position) pos:vec4f)->@location(0) f32{
  let p=vec2i(pos.xy);let size=vec2i(textureDimensions(sampleAux));
  if(any(p+vec2i(1)>=size)||view.back.w>=0.){return 0.;}
  let id=textureLoad(sampleID,p,0).x;let a=textureLoad(sampleAux,p,0);
  if(id==0u){
   if(any(p<vec2i(1))||any(p+vec2i(2)>=size)){return 0.;}
   for(var y=-1;y<=2;y++){for(var x=-1;x<=2;x++){
    if(textureLoad(sampleID,p+vec2i(x,y),0).x!=0u){return 0.;}
   }}
   return .5;
  }
  if(a.w<80.){return 0.;}
  var invDepth:array<f32,4>;
  for(var i=0u;i<4u;i++){
   let q=p+vec2i(vec2u(i%2u,i/2u));let h=textureLoad(sampleAux,q,0);
   if(textureLoad(sampleID,q,0).x!=id||h.w<80.||abs(h.w-a.w)>1.||dot(a.xyz,h.xyz)<.995){return 0.;}
   invDepth[i]=1./h.w;
  }
  // Affine reciprocal depth for a plane in this perspective bend strip.
  let residual=abs(invDepth[0]-invDepth[1]-invDepth[2]+invDepth[3])*a.w*a.w;
  ${w.mode==="sky"?"return 0.;":"return select(0.,1.,residual<.012);"}
 }`,"ridgeAccept",[{format:"r8unorm"}],2,!0):await T("Ridge slope classification",x+$+E+`
 @fragment fn ridgeAccept(@builtin(position) pos:vec4f)->@location(0) f32{
  let tile=vec2i(pos.xy);let size=vec2i(textureDimensions(sampleAux));let p=tile*4;
  if(textureLoad(tileScore,tile,0).z<${Q}||any(p<vec2i(1))||any(p+vec2i(4)>=size)){return 0.;}
  let mid=textureLoad(sampleAux,p+vec2i(2),0);
  if(mid.w<80.||mid.y<.44||mid.y>.9999){return 0.;}
  for(var y=-1;y<=4;y++){for(var x=-1;x<=4;x++){
   let k=p+vec2i(x,y);let h=textureLoad(sampleAux,k,0);
   if(textureLoad(sampleID,k,0).x==0u||abs(h.w-mid.w)>4.||dot(h.xyz,mid.xyz)<.78){return 0.;}
  }}
  return 1.;
 }`,"ridgeAccept",[{format:"r8unorm"}],2,!0),xe=F.replaceAll("in.pos.x","center.x").replaceAll("in.pos.y","center.y").replace("items[in.id]","items[(id&0xffffffu)-1u]"),ce=V||p?void 0:R?await T("Ridge four sample reconstruction",x+$+E+Y+`
 @fragment fn ridgeFill(@builtin(position) pos:vec4f)->VisibilitySurface{
  if(!${le}){discard;}
  let p=${j};if(textureLoad(tileMask,p,0).x<.75){discard;}
  let f=fract(pos.xy*.125-.5);var depth=0.;var normal=vec3f(0);
  for(var i=0u;i<4u;i++){
   let o=vec2i(vec2u(i%2u,i/2u));let h=textureLoad(sampleAux,p+o,0);
   let weight=select(1.-f,f,o==vec2i(1));let w=weight.x*weight.y;
   depth+=w/h.w;normal+=w*h.xyz;
  }
  let t=1./depth;return VisibilitySurface(t/256.,vec4f(normalize(normal),t),textureLoad(sampleID,p,0).x);
 }`,"ridgeFill",q,3,!0,!0):await T("Ridge plane reconstruction",x+$+E+Y+`
 @fragment fn ridgeFill(@builtin(position) pos:vec4f)->VisibilitySurface{
  if(textureLoad(tileMask,vec2i(pos.xy)/8,0).x==0.){discard;}
  let p=vec2i(pos.xy)/2;let center=vec2f(p)*2.+1.;let id=textureLoad(sampleID,p,0).x;
  let h=textureLoad(sampleAux,p,0);${xe}
  let delta=2.*(pos.xy-center)/view.viewport.xy;
  let deltaWorld=(delta.x*view.right.xyz*view.right.w-delta.y*view.up.xyz*view.up.w)/(-view.back.w);
  let dr=deltaWorld-vec3f(0,m*dot(deltaWorld.xz,view.bend.xy),0);
  let t=h.w*dot(rd,h.xyz)/dot(rd+dr,h.xyz);
  return VisibilitySurface(t/256.,vec4f(h.xyz,t),id);
 }`,"ridgeFill",q,3,!0,!0),M=(e,t,i,s)=>o.createTexture({label:e,size:[t,i],format:s,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});function ye(e,t){const i=Math.ceil(e/oe),s=Math.ceil(t/oe),d=Math.ceil(e/B),a=Math.ceil(t/B),f=M("Ridge scores",R?1:i,R?1:s,"rgba16float"),v=M("Ridge mask",p?1:i,p?1:s,"r8unorm"),c=M("Ridge samples",d,a,"rgba32float"),u=M("Ridge sample records",d,a,"r32uint"),m=M("Ridge sample depth",d,a,"depth24plus"),h=V?M("Ridge patch counts",d,a,"rgba16float"):void 0,k=[f,c,u,v].map(g=>g.createView()),l=p?o.createTexture({label:"Ridge pre-repair identity",size:[e,t],format:"r32uint",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING}):void 0,n=l&&C?o.createBindGroup({layout:C,entries:[{binding:0,resource:l.createView()},{binding:1,resource:k[1]},{binding:2,resource:k[2]}]}):void 0,b=(g,O)=>o.createBindGroup({layout:g,entries:k.slice(0,O).map((N,L)=>({binding:L,resource:N}))});return{w:e,h:t,scores:f,mask:v,work:h,views:k,snapshot:l,repairGroup:n,z:m.createView(),workView:h==null?void 0:h.createView(),scoreGroup:b(ee,1),sampleGroup:b(te,3),fullGroup:b(re,4),destroy(){for(const g of[f,v,c,u,m,h,l])g==null||g.destroy()}}}let y,U;const H=window,ue=()=>new Promise((e,t)=>{U?t(Error("Tile capture pending")):U={resolve:e,reject:t}});!p&&new URLSearchParams(location.search).has("qa")&&(H.ridgeTileCapture=ue);function X(e,t,i){const s=t===(y==null?void 0:y.work),d=i===1?1:2,a=Math.ceil(t.width*i*d/256)*256,f=o.createBuffer({size:a*t.height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});return e.copyTextureToBuffer({texture:t},{buffer:f,bytesPerRow:a},[t.width,t.height]),async()=>{try{await f.mapAsync(GPUMapMode.READ);const v=new DataView(f.getMappedRange()),c=[];for(let u=0;u<t.height;u++)for(let m=0;m<t.width*i;m++){const h=u*a+m*d;if(d===1){c.push(v.getUint8(h));continue}const k=v.getUint16(h,!0),l=k>>10,n=k&1023,b=l?2**(l-15)*(1+n/1024):n*2**-24;c.push(b*(s&&m%4!==2?64:1))}return{width:t.width,height:t.height,data:c}}finally{f.destroy()}}}return{draw(e,t,i,s,d,a,f,v,c,u,m,h,k=!1){const l=f&&me||ve;(!y||y.w!==t||y.h!==i)&&(y==null||y.destroy(),y=ye(t,i));const n=y,b=U;U=void 0;const g=r=>({view:r,clearValue:Pe,loadOp:"clear",storeOp:"store"}),O=u&&{querySet:u.querySet,beginningOfPassWriteIndex:u.beginningOfPassWriteIndex},N=u&&{querySet:u.querySet,endOfPassWriteIndex:u.endOfPassWriteIndex},L=r=>{r.setBindGroup(0,s),r.setBindGroup(1,d)};if(l.score&&(!V||b)){const r=e.beginRenderPass({colorAttachments:[g(n.views[0])],timestampWrites:O});r.setViewport(0,0,t/8,i/8,0,1),r.setPipeline(l.score),L(r),r.draw(6,a),r.end()}if(l.work&&b){const r=e.beginRenderPass({colorAttachments:[g(n.workView)]});r.setViewport(0,0,t/2,i/2,0,1),r.setPipeline(l.work),L(r),r.draw(6,a),r.end()}if(l.sample){const r=e.beginRenderPass({colorAttachments:[g(n.views[1]),g(n.views[2])],timestampWrites:R?O:void 0,depthStencilAttachment:{view:n.z,depthLoadOp:"clear",depthClearValue:1,depthStoreOp:"discard"}});r.setViewport(0,0,t/B,i/B,0,1),r.setPipeline(l.sample),L(r),r.setBindGroup(2,n.scoreGroup),r.draw(6,a),r.end()}if(de){const r=e.beginRenderPass({colorAttachments:[g(n.views[3])]});r.setPipeline(de),L(r),r.setBindGroup(2,n.sampleGroup),r.draw(3),r.end()}if(p){if(!l.fine||!n.snapshot||!n.repairGroup||!h)throw Error("Missing terrain repair targets");let r;if(_&&!k)r=_.draw(e,t,i,s,d,a,f,v,c,void 0,m);else{const D=e.beginRenderPass({colorAttachments:v,depthStencilAttachment:c});r=m(D,!1),D.end()}e.copyTextureToTexture({texture:h},{texture:n.snapshot},[t,i]);const A=e.beginRenderPass({colorAttachments:v.map(D=>({...D,loadOp:"load"})),depthStencilAttachment:{...c,depthLoadOp:"load"},timestampWrites:N});return L(A),A.setBindGroup(2,n.repairGroup),A.setPipeline(l.fine),A.draw(6,a),A.end(),w.canvas.dataset.ridgeTiles="repair",r|1<<P}const z=e.beginRenderPass({colorAttachments:v,depthStencilAttachment:c,timestampWrites:V&&!b?u:N});l.fine&&(L(z),z.setBindGroup(2,n.fullGroup),ce&&(z.setPipeline(ce),z.draw(3)),z.setPipeline(l.fine),z.draw(6,a));const he=m(z,!!l.fine)|(l.fine?1<<P:0);if(z.end(),w.canvas.dataset.ridgeTiles=w.mode,b){const r=X(e,n.scores,4),A=n.work?X(e,n.work,4):void 0,D=V||p?void 0:X(e,n.mask,1);queueMicrotask(async()=>{try{b.resolve({score:await r(),work:await(A==null?void 0:A()),mask:await(D==null?void 0:D())})}catch(ge){b.reject(ge)}})}return he},destroy(){_==null||_.destroy(),y==null||y.destroy(),U==null||U.reject(Error("Tile renderer closed")),H.ridgeTileCapture===ue&&delete H.ridgeTileCapture}}}export{Te as createScreenTileTrial};
