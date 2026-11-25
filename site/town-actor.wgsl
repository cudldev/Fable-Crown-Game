// Each arm samples the same right sleeve/hand field in its own joint space.
// Both fields encode distances in metres with a ±0.25 m band.
@group(0) @binding(6) var actorFields:texture_3d<f32>;
fn actorField(p:vec3f,lo:vec3f,hi:vec3f,slot:f32,colourAtHit:bool)->vec4f{
  let nearest=clamp(p,lo,hi);
  let uv=(nearest-lo)/(hi-lo);
  let dims=vec3f(textureDimensions(actorFields));
  let atlasUV=(uv*(dims.x-1.)+vec3f(.5,.5,slot*dims.x+.5))/dims;
  let texel=textureSampleLevel(actorFields,linearSampler,atlasUV,0.);
  // Outside a padded field box both the boundary sample and the distance to
  // the box restrict stepping; their maximum doesn't extrude its edge texels.
  var d=(texel.r-.5)*.5;
  if(any(nearest!=p)){d=max(d,length(p-nearest));}
  if(colourAtHit&&view.style.x>0.){
    let pigment=textureSampleLevel(actorFields,linearSampler,pigmentUV(atlasUV,dims),0.).gba;
    return vec4f(d,pigment);
  }
  return vec4f(d,texel.gba);
}
fn actorSleeve(p:vec3f,side:f32,angle:f32,colourAtHit:bool,obj:Item)->vec4f{
  let pivot=vec3f(.28,.84,-.01);
  let v=vec3f(side*p.x,p.yz)-pivot;
  let c=cos(angle);let s=sin(angle);
  let q=pivot+vec3f(v.x,c*v.y-s*v.z,s*v.y+c*v.z);
  let lo=select(vec3f(.10,.30,-.20),obj.atlas.xyz,obj.pose.w>0.);
  let hi=select(vec3f(.53,1.01,.22),obj.localMax.xyz,obj.pose.w>0.);
  return actorField(q,lo,hi,1.,colourAtHit);
}
fn actorUnion(a:vec4f,b:vec4f,colourAtHit:bool)->vec4f{
  let width=.032;
  let w=clamp(.5+.5*(b.x-a.x)/width,0.,1.);
  var ink=w;
  if(colourAtHit&&view.style.x>0.){ink=pigmentWeight(vec3f(w),view.style.x).x;}
  return vec4f(mix(b.x,a.x,w)-width*w*(1.-w),mix(b.yzw,a.yzw,ink));
}
fn townActorSample(p:vec3f,obj:Item,colourAtHit:bool)->vec4f{
  if(obj.pose.z<0.){
    let core=actorField(fishermanCorePoint(p,obj),obj.atlas.xyz,obj.localMax.xyz,0.,colourAtHit);
    let right=actorField(fishermanLimbPoint(p,7u,true,obj),vec3f(.10,.30,-.20),vec3f(.53,1.01,.22),1.,colourAtHit);
    let left=actorField(fishermanLimbPoint(p,4u,true,obj),vec3f(.10,.30,-.20),vec3f(.53,1.01,.22),1.,colourAtHit);
    var result=actorUnion(actorUnion(core,right,colourAtHit),left,colourAtHit);
    for(var side=0u;side<2u;side++){
      for(var joint=0u;joint<3u;joint++){
        var q=fishermanBind(p,10u+side*3u+joint,obj);q.x*=select(-1.,1.,side==1u);
        let leg=actorField(q,vec3f(0,-.06,-.20),vec3f(.27,.43,.24),f32(2u+joint),colourAtHit);
        result=actorUnion(result,leg,colourAtHit);
      }
    }
    // Smooth inverse-bind interpolation is a deformation estimator, not an
    // exact distance. Restrain steps; moderate fitted poses are reviewed locally.
    return vec4f(result.x*.62,result.yzw);
  }
  if(obj.pose.z>0.){return actorField(p,obj.atlas.xyz,obj.localMax.xyz,2.,colourAtHit);}
  let core=actorField(p,obj.atlas.xyz,obj.localMax.xyz,0.,colourAtHit);
  let right=actorSleeve(p,1.,obj.pose.x,colourAtHit,obj);
  let left=actorSleeve(p,-1.,obj.pose.y,colourAtHit,obj);
  return actorUnion(actorUnion(core,right,colourAtHit),left,colourAtHit);
}
fn townActorDistance(p:vec3f,obj:Item)->f32{return townActorSample(p,obj,false).x;}
fn townActorColor(p:vec3f,obj:Item)->vec3f{return townActorSample(p,obj,true).yzw;}
