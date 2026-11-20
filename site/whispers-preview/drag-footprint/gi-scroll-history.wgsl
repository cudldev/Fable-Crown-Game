struct ProbeHistory{direct:vec4f,reflected:vec4f}
struct Settings{weight:f32,columnsX:u32,reflected:u32,pad:u32}
@group(0) @binding(0) var directTarget:texture_3d<f32>;
@group(0) @binding(1) var reflectedTarget:texture_3d<f32>;
@group(0) @binding(2) var<storage,read_write> history:array<ProbeHistory>;
@group(0) @binding(3) var directDisplay:texture_storage_3d<rgba16float,write>;
@group(0) @binding(4) var reflectedDisplay:texture_storage_3d<rgba16float,write>;
@group(0) @binding(5) var<uniform> settings:Settings;
@group(0) @binding(6) var<storage,read> columns:array<u32>;
@compute @workgroup_size(4,4,4)
fn presentHistory(@builtin(local_invocation_id) local:vec3u,@builtin(workgroup_id) group:vec3u){
 let packed=columns[group.x];let column=packed&0x3fffffffu;
 let cell=vec3u(column%settings.columnsX,group.y,column/settings.columnsX)*4u+local;
 let dims=textureDimensions(directTarget);if(any(cell>=dims)){return;}
 let idx=cell.x+dims.x*(cell.y+dims.y*(cell.z-settings.pad));let p=vec3i(cell);
 let direct=textureLoad(directTarget,p,0);var reflected=vec4f(0);
 if(settings.reflected!=0u){reflected=textureLoad(reflectedTarget,p,0);}
 var next=ProbeHistory(direct,reflected);
 if((packed&0xc0000000u)==0u){
  let old=history[idx];next.direct=mix(old.direct,direct,settings.weight);
  next.reflected=mix(old.reflected,reflected,settings.weight);
 }
 history[idx]=next;textureStore(directDisplay,p,next.direct);textureStore(reflectedDisplay,p,next.reflected);
}
