import{oakLeafMesh as M}from"./oak-foliage-BgkQBrvM.js";function V(t,o){t=t.replace(/col=(valleyMatchedMaterialRamp\([^;]+\));/,`col=mix($1,col,${o.length?".60":".35"});`);const b="@fragment fn fragment(in:Vertex)->Surface{",l=t.indexOf(b),s=t.indexOf("  var t=0.;var n=",l),d=t.indexOf("  let logicalRange=",s);if(l<0||s<0||d<0)throw Error("Missing oak surface lighting block");const u=`
${o.length?`
struct Bough {center:vec3f, scale:vec3f, angles:vec4f}
const boughs=array(${o.map(r=>`Bough(vec3f(${r.center}),vec3f(${r.scale}),vec4f(${[Math.cos(r.yaw),Math.sin(r.yaw),Math.cos(r.pitch),Math.sin(r.pitch)]}))`).join(",")});
fn turnBough(v:vec3f, a:vec4f)->vec3f {
  let tilted=vec3f(v.x,a.z*v.y-a.w*v.z,a.w*v.y+a.z*v.z);
  return vec3f(a.x*tilted.x+a.y*tilted.z,tilted.y,-a.y*tilted.x+a.x*tilted.z);
}`:""}
struct LeafVertex {
  @builtin(position) pos:vec4f, @location(0) distance:f32,
  @location(1) normal:vec3f, @location(2) pigment:vec3f, @location(3) @interpolate(flat) id:u32,
}
fn leafRotate(v:vec3f,obj:Item)->vec3f {
  return vec3f(obj.shape.x*v.x+obj.shape.y*v.z,v.y,-obj.shape.y*v.x+obj.shape.x*v.z);
}
@vertex fn leafVertex(@location(0) localP:vec3f,@location(1) localN:vec3f,@location(2) pigment:vec3f,@location(3) id:u32,@builtin(instance_index) instance:u32)->LeafVertex {
  let obj=items[id];let light=view.back.w>0.;
  ${o.length?`let b=boughs[instance%${o.length}u];let p=b.center+turnBough(localP*b.scale,b.angles);let n=normalize(turnBough(localN/b.scale,b.angles));`:"let p=localP;let n=localN;"}
  let world=obj.origin.xyz+leafRotate(p,obj)/obj.shape.z;
  let stripe=dot(world.xz,view.bend.xy)+view.bend.z;
  let bend=select(obj.center.w*stripe+obj.extent.w,0.,light);
  let bent=world+vec3f(0.,bend,0.)-view.at.xyz;
  let xy=vec2f(dot(view.right.xyz,bent)/view.right.w,dot(view.up.xyz,bent)/view.up.w);
  let depthAlong=dot(view.back.xyz,bent);
  var t=72.-depthAlong;var clip=vec4f(xy,0.,1.);
  if(view.back.w<0.){t=-view.back.w-depthAlong;clip=vec4f(xy*(-view.back.w),.5*t,t);}
  if((u32(obj.band.z)&select(2u,1u,light))==0u){clip=vec4f(2.,2.,0.,1.);}
  return LeafVertex(clip,t,leafRotate(n,obj),pigment,id);
}
@fragment fn leafShadow(in:LeafVertex)->@builtin(frag_depth) f32 {return in.distance/144.;}
struct LeafLegacyShadow{@builtin(frag_depth) depth:f32,@location(0) color:vec4f}
@fragment fn leafLegacyShadow(in:LeafVertex)->LeafLegacyShadow {
  return LeafLegacyShadow(in.distance/144.,vec4f(0.));
}
`;return t.slice(0,l)+u+t.slice(l,s).replace(b,"@fragment fn leafFragment(in:LeafVertex)->Surface{")+`
  let t=in.distance;let hit=ro+rd*t;
  if(t<bandNear-.00015||t>bandFar+.00015){discard;}
  var n=normalize(in.normal);var col=in.pigment*obj.tint.rgb;
`+t.slice(d)}async function k(t,o,b,l,s,d,v,u=M(),r=[]){const y=t.createShaderModule({label:"Oak leaf clusters",code:V(b,r)}),g=r.length||1,p=t.createPipelineLayout({bindGroupLayouts:o}),x={module:y,entryPoint:"leafVertex",buffers:[{arrayStride:36,attributes:[0,1,2].map(e=>({shaderLocation:e,offset:12*e,format:"float32x3"}))},{arrayStride:4,stepMode:"instance",attributes:[{shaderLocation:3,offset:0,format:"uint32"}]}]},w={format:s,depthWriteEnabled:!0,depthCompare:"less"},[j,S]=await Promise.all([t.createRenderPipelineAsync({label:"Oak foliage camera",layout:p,vertex:x,depthStencil:w,fragment:{module:y,entryPoint:"leafFragment",targets:[{format:l},{format:"r32uint"}]}}),t.createRenderPipelineAsync({label:"Oak foliage shadow",layout:p,vertex:x,depthStencil:{...w,format:"depth24plus"},fragment:{module:y,entryPoint:d?"leafLegacyShadow":"leafShadow",targets:d?[{format:l}]:[]}})]);function m(e,h){const n=t.createBuffer({size:Math.ceil(e.byteLength/4)*4,usage:h,mappedAtCreation:!0});return new Uint8Array(n.getMappedRange()).set(new Uint8Array(e.buffer,e.byteOffset,e.byteLength)),n.unmap(),n}const L=m(u.vertices,GPUBufferUsage.VERTEX),z=m(u.indices,GPUBufferUsage.INDEX);let i=new Uint32Array(64);const B=e=>t.createBuffer({label:"Oak draw records",size:e,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});let f=B(i.byteLength),a=0;return{prepare(e,h){a=0;for(let n=0;n<h;n++){const c=n*40;if(!(e[c+11]!==3||e[c+20]!==v.x||e[c+21]!==v.y||e[c+31]!==v.z)){if(a+g>i.length){const P=new Uint32Array(Math.max(i.length*2,a+g));P.set(i),i=P}i.fill(n,a,a+g),a+=g}}return f.size<i.byteLength&&(f.destroy(),f=B(i.byteLength)),a&&t.queue.writeBuffer(f,0,i.buffer,0,a*4),a/g},draw(e,h,n,c=!1){a&&(e.setPipeline(c?S:j),e.setBindGroup(0,h),e.setBindGroup(1,n),e.setVertexBuffer(0,L),e.setVertexBuffer(1,f),e.setIndexBuffer(z,"uint16"),e.drawIndexed(u.indices.length,a))},destroy(){L.destroy(),z.destroy(),f.destroy()}}}export{k as createOakLeafPass};
