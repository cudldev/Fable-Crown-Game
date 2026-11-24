const y=`
struct Glow { threshold: f32, knee: f32 };
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@group(0) @binding(2) var<uniform> glow: Glow;
struct Corner { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vertex(@builtin(vertex_index) i: u32) -> Corner {
  let corners = array(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  return Corner(vec4f(corners[i],0.,1.),corners[i]*vec2f(.5,-.5)+.5);
}
// Four taps one source texel out, each a bilinear average of four texels.
fn spread(uv: vec2f, reach: f32) -> vec3f {
  let texel = reach / vec2f(textureDimensions(source));
  return .25 * (textureSampleLevel(source,sourceSampler,uv+texel*vec2f(-1.,-1.),0.).rgb
              + textureSampleLevel(source,sourceSampler,uv+texel*vec2f( 1.,-1.),0.).rgb
              + textureSampleLevel(source,sourceSampler,uv+texel*vec2f(-1., 1.),0.).rgb
              + textureSampleLevel(source,sourceSampler,uv+texel*vec2f( 1., 1.),0.).rgb);
}
// Keep only what is brighter than the threshold, by its strongest channel so that warm light counts.
// The share rises smoothly up to full brightness, so lit walls and sand give little and
// lamps, windows and glints give most of their colour.
fn bright(colour: vec3f) -> vec3f {
  let peak = max(colour.r,max(colour.g,colour.b));
  return colour * smoothstep(glow.threshold,glow.threshold+glow.knee,peak);
}
@fragment fn select(in: Corner) -> @location(0) vec4f {
  let texel = 1. / vec2f(textureDimensions(source));
  // The first step shrinks the scene four times, so each tap averages a two by two patch.
  return vec4f(.25 * (bright(textureSampleLevel(source,sourceSampler,in.uv+texel*vec2f(-1.,-1.),0.).rgb)
                    + bright(textureSampleLevel(source,sourceSampler,in.uv+texel*vec2f( 1.,-1.),0.).rgb)
                    + bright(textureSampleLevel(source,sourceSampler,in.uv+texel*vec2f(-1., 1.),0.).rgb)
                    + bright(textureSampleLevel(source,sourceSampler,in.uv+texel*vec2f( 1., 1.),0.).rgb)),1.);
}
@fragment fn shrink(in: Corner) -> @location(0) vec4f { return vec4f(spread(in.uv,1.),1.); }
@fragment fn widen(in: Corner) -> @location(0) vec4f { return vec4f(spread(in.uv,.75),.5); }
`;async function G(o){const f="rgba16float",p=o.createShaderModule({label:"Whispers bloom",code:y}),m=o.createBindGroupLayout({label:"Whispers bloom",entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),c=(t,s=!1)=>o.createRenderPipelineAsync({label:"Whispers bloom "+t,layout:o.createPipelineLayout({bindGroupLayouts:[m]}),vertex:{module:p,entryPoint:"vertex"},fragment:{module:p,entryPoint:t,targets:[{format:f,...s?{blend:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"zero",dstFactor:"one"}}}:{}}]}}),[h,g,b]=await Promise.all([c("select"),c("shrink"),c("widen",!0)]),d=o.createSampler({minFilter:"linear",magFilter:"linear"}),n=new Float32Array(4),u=o.createBuffer({size:n.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),v=t=>o.createBindGroup({layout:m,entries:[{binding:0,resource:t},{binding:1,resource:d},{binding:2,resource:{buffer:u}}]});let e;return{resize(t){if((e==null?void 0:e.scene)!==t){for(const r of(e==null?void 0:e.textures)??[])r.destroy();const s=Array.from({length:3},(r,a)=>o.createTexture({label:"Whispers bloom "+a,format:f,size:[Math.max(1,Math.ceil(t.width/(4<<a))),Math.max(1,Math.ceil(t.height/(4<<a)))],usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})),l=s.map(r=>r.createView());e={scene:t,textures:s,views:l,fromScene:v(t.createView()),from:l.map(v)}}return e.views[0]},draw(t,s){if(!e)return;n[0]=s,n[1]=Math.max(.08,1-s),o.queue.writeBuffer(u,0,n);const l=(r,a,x,w,S=!1)=>{const i=t.beginRenderPass({label:r,colorAttachments:[{view:a,loadOp:S?"load":"clear",storeOp:"store",clearValue:[0,0,0,1]}]});i.setPipeline(x),i.setBindGroup(0,w),i.draw(3),i.end()};l("Whispers bloom select",e.views[0],h,e.fromScene);for(let r=1;r<3;r++)l("Whispers bloom shrink",e.views[r],g,e.from[r-1]);for(let r=2;r>0;r--)l("Whispers bloom widen",e.views[r-1],b,e.from[r],!0)},destroy(){for(const t of(e==null?void 0:e.textures)??[])t.destroy();u.destroy()}}}export{G as createValleyBloom};
