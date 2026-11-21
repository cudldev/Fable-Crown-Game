const F=`
@group(2) @binding(0) var<uniform> scanLayout:vec4u; // tiles X/Y, atlas columns/rows
const scanTileSize=32u;
struct ScanVertex {@builtin(position) pos:vec4f,@location(0) @interpolate(flat) strip:u32}
@vertex fn scanVertex(@builtin(vertex_index) v:u32,@builtin(instance_index) strip:u32)->ScanVertex{
 let cell=vec2u(strip%scanLayout.z,strip/scanLayout.z);
 let corner=array<vec2u,6>(vec2u(0,0),vec2u(1,0),vec2u(0,1),vec2u(0,1),vec2u(1,0),vec2u(1,1));
 let uv=vec2f(cell+corner[v])/vec2f(scanLayout.zw);
 return ScanVertex(vec4f(2.*uv.x-1.,1.-2.*uv.y,0,1),strip);
}
fn scanDirection(pixel:vec2f,m:f32)->vec3f{
 let ndc=vec2f(2.*pixel.x/view.viewport.x-1.,1.-2.*pixel.y/view.viewport.y);
 let offset=view.right.xyz*ndc.x*view.right.w+view.up.xyz*ndc.y*view.up.w;
 let d=-view.back.xyz+offset/(-view.back.w);
 return d-vec3f(0,m*dot(d.xz,view.bend.xy),0);
}
// Intersect the possible distances with origin + rate * t >= low.
fn scanPlane(span:vec2f,origin:f32,rate:f32,low:f32)->vec2f{
 if(abs(rate)<1e-8){if(origin+.00001<low){return vec2f(1,0);}return span;}
 let t=(low-origin)/rate;
 if(rate>0.){return vec2f(max(span.x,t),span.y);}
 return vec2f(span.x,min(span.y,t));
}
fn scanAxis(span:vec2f,o:f32,dlo:f32,dhi:f32,lo:f32,hi:f32)->vec2f{
 return scanPlane(scanPlane(span,o,dhi,lo),-o,-dlo,-hi);
}
// Unknown groups, partial residency and exposed outside walls keep the trace.
fn scanMayHit(o:vec3f,dlo:vec3f,dhi:vec3f,span:vec2f,pad:f32)->bool{
 let low=o+min(dlo*span.x,dlo*span.y)-vec3f(pad);
 let high=o+max(dhi*span.x,dhi*span.y)+vec3f(pad);
 let dims=vec2u(valleyGroundData[2],valleyGroundData[3]);
 let groups=(dims+3u)/4u;
 let offset=valleyGroundData[15];let count=groups.x*groups.y;
 if(offset==0u||arrayLength(&valleyGroundData)<offset+2u*count){return true;}
 let origin=valleyGroundLow();
 if(any(low.xz<=origin)||any(high.xz>=origin+vec2f(dims))){return true;}
 let first=vec2u((low.xz-origin)*.25);let last=vec2u((high.xz-origin)*.25);
 if(any(last-first>vec2u(7))){return true;}
 let slopePad=2.*pad*bitcast<f32>(valleyGroundData[14]);
 var above=true;var below=low.y>0.;
 for(var z=first.y;z<=last.y;z++){for(var x=first.x;x<=last.x;x++){
  let i=offset+z*groups.x+x;
  let top=bitcast<f32>(valleyGroundData[i]);let bottom=bitcast<f32>(valleyGroundData[i+count]);
  above=above&&top>=0.&&low.y-slopePad>top;
  below=below&&bottom>=0.&&top>=bottom&&high.y+slopePad<bottom;
  if(!above&&!below){return true;}
 }}
 return false;
}
@fragment fn scanTile(in:ScanVertex)->@location(0) vec4f{
 if(view.back.w>=0.||view.bend.w<=0.){return vec4f(0,256,1,0);}
 let obj=items[in.strip];let m=obj.center.w;
 let cell=vec2u(in.pos.xy)%scanLayout.xy;
 let p=vec2f(cell*scanTileSize)-vec2f(1);let q=min(vec2f((cell+1u)*scanTileSize),view.viewport.xy)+vec2f(1);
 let a=scanDirection(p,m);let b=scanDirection(vec2f(p.x,q.y),m);let c=scanDirection(vec2f(q.x,p.y),m);let e=scanDirection(q,m);
 let dlo=min(min(a,b),min(c,e));let dhi=max(max(a,b),max(c,e));
 let eye=view.at.xyz-view.back.xyz*view.back.w;
 let ed=dot(eye.xz,view.bend.xy)+view.bend.z;
 let o=eye+vec3f(0,1.-m*ed-obj.extent.w,0);
 let axis=view.bend.xy;
 let rb=vec4f(dot(a.xz,axis),dot(b.xz,axis),dot(c.xz,axis),dot(e.xz,axis));
 let pad=.004+.00001*(length(o)+length(valleyGroundLow())+256.*max(length(dlo),length(dhi)));
 let band=scanAxis(vec2f(0,256.01),ed,min(min(rb.x,rb.y),min(rb.z,rb.w)),max(max(rb.x,rb.y),max(rb.z,rb.w)),obj.band.x-pad,obj.band.y+pad);
 let low=vec3f(valleyGroundLow().x,0,valleyGroundLow().y)-vec3f(pad);
 let high=low+vec3f(valleyGroundSize().x,valleyGroundTop(),valleyGroundSize().y)+vec3f(2.*pad);
 var span=band;
 for(var i=0u;i<3u;i++){span=scanAxis(span,o[i],dlo[i],dhi[i],low[i],high[i]);}
 if(span.x>span.y){return vec4f(0);}
 var first=256.;var last=0.;var possible=0.;
 for(var i=0u;i<8u;i++){
  let ab=mix(vec2f(span.x),vec2f(span.y),vec2f(f32(i),f32(i+1u))*.125);
  if(scanMayHit(o,dlo,dhi,ab,pad)){first=min(first,ab.x);last=max(last,ab.y);possible+=1.;}
 }
 return vec4f(first,last,possible,0);
}`;async function H(e,q,b,m,g,E,O){const c=GPUShaderStage.FRAGMENT,w=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|c,buffer:{type:"uniform"}}]}),h=e.createBindGroupLayout({entries:[{binding:0,visibility:c,buffer:{type:"uniform"}},{binding:1,visibility:c,texture:{sampleType:"unfilterable-float"}}]}),z=a=>e.createPipelineLayout({bindGroupLayouts:[...q,a]}),G=e.createShaderModule({label:"Terrain coarse view scan",code:b+F}),I=await e.createRenderPipelineAsync({label:"Terrain coarse view scan",layout:z(w),vertex:{module:G,entryPoint:"scanVertex"},fragment:{module:G,entryPoint:"scanTile",targets:[{format:"rgba32float"}]}});async function P(a){const o="@fragment fn fragment(in:Vertex)->VisibilitySurface{";if(!a.includes(o))throw Error("Unknown terrain visibility entry");const d=`@group(2) @binding(0) var<uniform> scanLayout:vec4u;
@group(2) @binding(1) var scanRange:texture_2d<f32>;
`+a.replace(o,o+`
  let scanCell=vec2u(in.pos.xy)/32u+vec2u(in.id%scanLayout.z,in.id/scanLayout.z)*scanLayout.xy;
  let coarse=textureLoad(scanRange,vec2i(scanCell),0);
  if(coarse.z==0.){discard;}`).replace("var t=0.;var n=","if(bandNear>coarse.y+.02||bandFar<coarse.x-.02){discard;}var t=0.;var n="),s=e.createShaderModule({label:"Terrain scan survivors",code:d});return e.createRenderPipelineAsync({label:"Terrain scan survivors",layout:z(h),vertex:{module:s,entryPoint:"vertex",constants:{coverageMode:E}},fragment:{module:s,entryPoint:"fragment",constants:{atlasBank:g},targets:[{format:"rgba32float"},{format:"r32uint"}]},depthStencil:{format:"depth24plus",depthCompare:"less",depthWriteEnabled:!0}})}const[W,S]=await Promise.all([P(b),m?P(m):void 0]),u=e.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),T={binding:0,resource:{buffer:u}},C=e.createBindGroup({layout:w,entries:[T]});let t,f,L,D="";return{draw(a,o,d,s,B,l,N,U,M,n,A){const v=Math.ceil(o/32),p=Math.ceil(d/32),y=Math.min(l,Math.max(1,Math.floor(e.limits.maxTextureDimension2D/v)),Math.ceil(Math.sqrt(l))),x=Math.ceil(l/y),R=[v,p,y,x],V=R.join(",");if(p*x>e.limits.maxTextureDimension2D){const k=a.beginRenderPass({colorAttachments:U,depthStencilAttachment:M,timestampWrites:n}),j=A(k,!1);return k.end(),j}V!==D&&(t==null||t.destroy(),t=e.createTexture({label:"Terrain scan depth intervals",size:[v*y,p*x],format:"rgba32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),f=t.createView(),L=e.createBindGroup({layout:h,entries:[T,{binding:1,resource:f}]}),e.queue.writeBuffer(u,0,new Uint32Array(R)),D=V);const r=a.beginRenderPass({colorAttachments:[{view:f,loadOp:"clear",storeOp:"store",clearValue:[0,0,0,0]}],timestampWrites:n&&{querySet:n.querySet,beginningOfPassWriteIndex:n.beginningOfPassWriteIndex}});r.setPipeline(I),r.setBindGroup(0,s),r.setBindGroup(1,B),r.setBindGroup(2,C),r.draw(6,l),r.end();const i=a.beginRenderPass({colorAttachments:U,depthStencilAttachment:M,timestampWrites:n&&{querySet:n.querySet,endOfPassWriteIndex:n.endOfPassWriteIndex}});i.setPipeline(N&&S?S:W),i.setBindGroup(0,s),i.setBindGroup(1,B),i.setBindGroup(2,L),i.draw(6,l);const _=1<<g|A(i,!0);return i.end(),O.dataset.ridgeScan="active",_},destroy(){t==null||t.destroy(),u.destroy()}}}export{H as createTerrainViewScan};
