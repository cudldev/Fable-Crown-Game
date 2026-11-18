// Shared by the sky triangle and the distance/height fog on SDF receivers.
// The curved tabletop drops away below the horizontal. Its apparent sky line at
// gameplay zoom is about 27 degrees below eye level, including at normal pitch.
fn skyHorizonHeight(direction:vec3f)->f32{return direction.y+.45;}
fn skyAzimuth(v:vec2f)->vec2f{return v*inverseSqrt(max(.00001,dot(v,v)));}
fn fogColor(direction:vec3f,sun:vec3f,day:f32,dusk:f32,hour:f32)->vec3f{
  let facing=clamp(.5+.5*dot(skyAzimuth(direction.xz),skyAzimuth(sun.xz)),0.,1.);
  let glow=facing*facing*facing;
  let horizon=mix(vec3f(.13,.19,.29),vec3f(.71,.79,.80),day);
  let warm=select(vec3f(.95,.64,.43),vec3f(.97,.73,.57),hour<12.);
  return mix(horizon,warm,dusk*(.22+.64*glow));
}

fn skyHash(p:vec2f)->f32{
  var q=fract(vec3f(p.x,p.y,p.x)*vec3f(.1031,.1030,.0973));
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
// The first octave's analytic slope also shades the cloud's sun-facing side.
fn skyNoise(p:vec2f)->vec3f{
  let cell=floor(p);let f=fract(p);let u=f*f*(3.-2.*f);let du=6.*f*(1.-f);
  let a=skyHash(cell);let b=skyHash(cell+vec2f(1,0));
  let c=skyHash(cell+vec2f(0,1));let d=skyHash(cell+1.);
  return vec3f(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),
    mix(b-a,d-c,u.y)*du.x,mix(c-a,d-b,u.x)*du.y);
}
// One world field supplies silhouette, internal lobes and analytic slopes.
// Wind phase is integrated once on the CPU and shared with the sky and mist.
struct DistanceFogField {shape:vec3f,density:f32,slope:vec2f}
fn distanceFogBank(p:vec3f,windOffset:vec2f)->DistanceFogField{
  let uv=(p.xz-windOffset)*.085+p.y*vec2f(.028,-.020)+vec2f(4.7,13.2);
  let rotation=mat2x2f(.8,.6,-.6,.8);
  let broad=skyNoise(uv);
  let detail=skyNoise(rotation*uv*2.03+vec2f(7.1,-3.4));
  let fine=skyNoise(uv*6.07+vec2f(-11.3,5.8));
  // Broad banks, middle lobes, and small cloudlets share a stable world field.
  let shape=smoothstep(vec3f(.30),vec3f(.70),vec3f(.85*broad.x+.15*detail.x,.28*broad.x+.72*detail.x,.20*detail.x+.80*fine.x));
  let density=.20*broad.x+.60*detail.x+.20*fine.x;
  let slope=.25*broad.yz+.30*2.03*(transpose(rotation)*detail.yz)+.03*6.07*fine.yz;
  return DistanceFogField(shape,density,slope);
}
fn texturedDistanceFog(color:vec3f,field:DistanceFogField,sun:vec3f,day:f32,amount:f32)->vec3f{
  if(amount<=0.){return color;}
  // A height-field lighting cue gives each lobe a soft lit side and cool fold.
  // This is an art-directed approximation; it does not sample volume shadows.
  let light=clamp(smoothstep(.24,.78,field.density)-.05*dot(field.slope,skyAzimuth(sun.xz)),0.,1.);
  // Cloud banks use softly shaded neutral vapor, not dark blue water-like folds.
  let vapor=mix(color,mix(vec3f(.25,.29,.34),vec3f(.78,.79,.76),day),.78);
  let shadow=vapor*vec3f(.84,.85,.86);
  let highlight=min(vec3f(1),vapor*1.08+vec3f(.025)*day);
  return mix(color,mix(shadow,highlight,light),smoothstep(0.,.65,amount));
}
fn shapedDistanceFade(start:f32,end:f32,distance:f32,bank:vec3f,strength:f32)->f32{
  // Preserve the original arithmetic for the comparison setting.
  if(strength<=0.){return smoothstep(start,end,distance);}
  let t=clamp((distance-start)/max(.0001,end-start),0.,1.);
  // Thin cloudlets appear first, middle lobes join them, and broad opaque
  // banks swallow their interior detail. Each coverage only grows with t;
  // the final union becomes one solid mass before the culling boundary.
  let leading=smoothstep(0.,.08,t);
  let cloudlets=.55*leading*smoothstep(1.02-1.20*t,1.14-1.20*t,bank.z);
  let lobes=.85*leading*smoothstep(1.20-1.30*t,1.35-1.30*t,bank.y);
  let banks=leading*smoothstep(1.45-1.65*t,1.65-1.65*t,bank.x);
  let solid=smoothstep(.85,1.,t);
  let shaped=1.-(1.-cloudlets)*(1.-lobes)*(1.-banks)*(1.-solid);
  return mix(smoothstep(0.,1.,t),clamp(shaped,0.,1.),strength);
}
fn windAtmosphericSky(direction:vec3f,sun:vec3f,day:f32,dusk:f32,hour:f32,time:f32,cloudAmount:f32,windOffset:vec2f)->vec3f{
  let altitude=skyHorizonHeight(direction);
  let horizon=fogColor(direction,sun,day,dusk,hour);
  let zenith=mix(vec3f(.035,.06,.13),vec3f(.30,.53,.71),day);
  var sky=mix(horizon,zenith,smoothstep(0.,.95,altitude));
  // Only the day sun has an unambiguous direction in the town light rig.
  // The night rig keeps a positive elevation for fill.
  let alignment=max(0.,dot(direction,sun));
  sky+=vec3f(.24,.19,.12)*day*smoothstep(.984,.9997,alignment);
  sky=mix(sky,vec3f(1.,.95,.80),day*smoothstep(.99986,.99996,alignment));
  if(altitude<=.012||cloudAmount<=0.){return sky;}
  let wind=-windOffset*.1;
  // Flatten the projection near the horizon to avoid subpixel flicker there.
  let uv=direction.xz/(.17+altitude)*1.65+wind+vec2f(2.17,7.64);
  let rotation=mat2x2f(.8,.6,-.6,.8);
  let base=skyNoise(uv);let detail=skyNoise(rotation*uv*2.03+vec2f(3.7,-2.1)).x;
  let fine=skyNoise(uv*4.07+vec2f(17.2,3.4)).x;
  let density=.62*base.x+.27*detail+.11*fine;
  let cover=smoothstep(.44,.60,density)*smoothstep(.012,.13,altitude)*clamp(cloudAmount,0.,1.);
  let edge=clamp(.54-.44*dot(base.yz,skyAzimuth(sun.xz)),0.,1.);
  let shadow=mix(vec3f(.115,.145,.21),vec3f(.62,.71,.76),day);
  let highlight=mix(vec3f(.25,.30,.39),mix(vec3f(.96,.95,.89),vec3f(1.,.78,.58),dusk),day);
  return mix(sky,mix(shadow,highlight,edge),cover*.90);
}
// Shared by clear background pixels and fully fogged receivers. The cloud
// sheet continues beyond the draw radius; only the sky horizon softens it.
fn cloudFogBackdrop(eye:vec3f,direction:vec3f,sun:vec3f,day:f32,dusk:f32,hour:f32,time:f32,cloudAmount:f32,windOffset:vec2f,strength:f32)->vec3f{
  let ray=normalize(direction);
  let sky=windAtmosphericSky(ray,sun,day,dusk,hour,time,cloudAmount,windOffset);
  let amount=strength*smoothstep(.30,.60,-ray.y);
  if(amount<=0.){return sky;}
  // A world-aligned fog sheet, with a flattened projection near the horizon.
  // It has no draw-distance dependency and never opens visibility past culling.
  let travel=max(0.,eye.y)/max(.20,-direction.y);
  let point=eye+direction*travel;
  let field=distanceFogBank(vec3f(point.x,0.,point.z),windOffset);
  return texturedDistanceFog(sky,field,sun,day,amount);
}
