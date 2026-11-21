import{d as v,e as y,t as z}from"./PrivateValley-CGazMqAn.js";import"./index-DnfQ7ISf.js";import"./ActionCycle-Bh97UskT.js";import"./three.module-Df_d6poP.js";import"./index-Dd3vCFI-.js";const G=`  let patchCell=vec2f(tile*15+valleySculptCell(local,d.xz,15.));
  let crossX=min(valleySculptCross(o.x,p.x,d.x,low.x,quarter.x,4.,reference),select(valleySculptCross(o.x,p.x,d.x,low.x,patchCell.x,15.,reference),1e20,flat));
  let crossZ=min(valleySculptCross(o.z,p.z,d.z,low.z,quarter.y,4.,reference),select(valleySculptCross(o.z,p.z,d.z,low.z,patchCell.y,15.,reference),1e20,flat));`,D=`  var crossX=valleySculptCross(o.x,p.x,d.x,low.x,quarter.x,4.,reference);
  var crossZ=valleySculptCross(o.z,p.z,d.z,low.z,quarter.y,4.,reference);
  if(!flat){
   let patchCell=vec2f(tile*15+valleySculptCell(local,d.xz,15.));
   crossX=min(crossX,valleySculptCross(o.x,p.x,d.x,low.x,patchCell.x,15.,reference));
   crossZ=min(crossZ,valleySculptCross(o.z,p.z,d.z,low.z,patchCell.y,15.,reference));
  }`,P=`let surfacePatch=valleySculptPatch(p.xz,d.xz);let h=surfacePatch.h;let u=surfacePatch.uv.x;let v=surfacePatch.uv.y;
  let hx=h.y-h.x;let hz=h.z-h.x;let hxz=h.w-h.y-h.z+h.x;let du=d.x*15.;let dv=d.z*15.;
  let c=p.y-surfacePatch.base-h.x-hx*u-hz*v-hxz*u*v;let b=d.y-hx*du-hz*dv-hxz*(u*dv+v*du);let a=-hxz*du*dv;`,S=`
  var surfacePatch:ValleySculptPatch;
  var a=0.;var b=d.y;var c:f32;
  if(flat){
   // All 256 distance codes agree. The upper pigment bits can still vary.
   let word=valleyGroundData[valleyGroundData[at]];
   let h=-.25+(32767.5-f32(word&65535u))/bitcast<f32>(valleyGroundData[12])-bitcast<f32>(valleyGroundData[13]);
   let base=1.+bitcast<f32>(valleyGroundData[at+1u])+valleySculptQuarter(at,local,d.xz);
   c=p.y-base-h;
  }else{
   surfacePatch=valleySculptPatch(p.xz,d.xz);let h=surfacePatch.h;let u=surfacePatch.uv.x;let v=surfacePatch.uv.y;
   let hx=h.y-h.x;let hz=h.z-h.x;let hxz=h.w-h.y-h.z+h.x;let du=d.x*15.;let dv=d.z*15.;
   c=p.y-surfacePatch.base-h.x-hx*u-hz*v-hxz*u*v;b=d.y-hx*du-hz*dv-hxz*(u*dv+v*du);a=-hxz*du*dv;
  }`,h="if(!openCut&&c<=.000002){return ValleyGroundHit(t,select(valleySculptNormal(surfacePatch),normal,c<-.000002),valleySculptMaterial(surfacePatch));}";function O(e){if(!e.includes("fn valleySculptRef("))return e;const t=e.indexOf("fn valleyGroundTrace("),l=e.indexOf("fn valleyGroundRay(",t);if(t<0||l<0)throw Error("Valley moving ground trace changed");let a=e.slice(t,l);for(const[r,n]of[[G,D],[P,S],[h,h.replace("{return","{if(flat){surfacePatch=valleySculptPatch(p.xz,d.xz);}return")]]){const i=a.indexOf(r);if(i<0||a.indexOf(r,i+r.length)>=0)throw Error("Valley moving ground traversal anchor changed");a=a.slice(0,i)+n+a.slice(i+r.length)}return e.slice(0,t)+a+e.slice(l)}const H=`
fn valleyBandGroupAbove(offset:u32,count:u32,width:u32,cell:vec2u,rayHeight:f32)->bool{
 let index=offset+cell.y*width+cell.x;
 let top=bitcast<f32>(valleyGroundData[index]);
 let bottom=bitcast<f32>(valleyGroundData[index+count]);
 // The existing upper-plane sentinel also invalidates the new lower bound.
 return bottom>=0.&&top>=bottom&&rayHeight<bottom;
}

fn valleyBandBuried(o:vec3f,d:vec3f,minimum:f32,limit:f32)->bool{
 let offset=valleyGroundData[15];
 let width=(valleyGroundData[2]+3u)/4u;
 let count=width*((valleyGroundData[3]+3u)/4u);
 if(offset==0u||count==0u||arrayLength(&valleyGroundData)!=offset+2u*count){return false;}
 if(!(minimum>0.&&limit>=minimum&&limit<=256.)){return false;}
 // The vertical ray shortcut ignores open cuts. Keep it on the original path.
 if(abs(d.x)+abs(d.z)<1e-10||!all(abs(d)<=vec3f(4.))||!all(abs(o)<=vec3f(8192.))){return false;}
 let startOffset=d*max(0.,minimum-.00004);
 let endOffset=d*(limit+.00004);
 let start=o+startOffset;let end=o+endOffset;
 let low=valleyGroundLow();let size=valleyGroundSize();
 // Cover the opposite side of the entry quarter and roundoff in add/subtract
 // and boundary reconstruction. The .00025 residency cut must stay outside.
 let padding=vec2f(.002)+.000002*(abs(o.xz)+abs(low)+max(abs(startOffset.xz),abs(endOffset.xz)));
 let footprintMin=min(start.xz,end.xz)-low-padding;
 let footprintMax=max(start.xz,end.xz)-low+padding;
 if(!(all(footprintMin>vec2f(0.))&&all(footprintMax<size))){return false;}
 let first=vec2u(footprintMin*.25);let last=vec2u(footprintMax*.25);
 let span=last-first;
 if(any(span>vec2u(1u))){return false;}
 // The lower plane bounds the nodes and treads. Include extrapolation from
 // biased patch ownership and keep the enlarged segment above slab bottom.
 let verticalError=.002+.000002*(abs(o.y)+max(abs(startOffset.y),abs(endOffset.y)));
 let derivative=bitcast<f32>(valleyGroundData[14]);
 let rayHeight=max(start.y,end.y)+verticalError+2.*max(padding.x,padding.y)*derivative;
 if(!(min(start.y,end.y)>verticalError&&rayHeight<valleyGroundTop())){return false;}
 if(!valleyBandGroupAbove(offset,count,width,first,rayHeight)){return false;}
 if(span.x==1u&&!valleyBandGroupAbove(offset,count,width,vec2u(last.x,first.y),rayHeight)){return false;}
 if(span.y==1u&&!valleyBandGroupAbove(offset,count,width,vec2u(first.x,last.y),rayHeight)){return false;}
 return !all(span==vec2u(1u))||valleyBandGroupAbove(offset,count,width,last,rayHeight);
}
`;function p(e,t=!1){if(!e.includes("fn valleySculptRef("))return e;const l="fn valleyGroundRayRange(",a=" return valleyGroundTrace(o,d,minimum,min(limit,256.),false,top);",r=e.indexOf(l),n=e.indexOf(a,r);if(r<0||n<0||e.indexOf(l,r+l.length)>=0||e.indexOf(a,n+a.length)>=0)throw Error("Valley buried band traversal anchor changed");const i=t?"previous.distance>=0.&&":"";return e.slice(0,r)+H+e.slice(r,n)+" if("+i+`valleyBandBuried(o,d,minimum,min(limit,256.))){return ValleyGroundHit(-1.,vec3f(0),0u);}
`+e.slice(n)}const T=`let surfacePatch=valleySculptPatch(p.xz,d.xz);let h=surfacePatch.h;let u=surfacePatch.uv.x;let v=surfacePatch.uv.y;
  let hx=h.y-h.x;let hz=h.z-h.x;let hxz=h.w-h.y-h.z+h.x;let du=d.x*15.;let dv=d.z*15.;
  let c=p.y-surfacePatch.base-h.x-hx*u-hz*v-hxz*u*v;let b=d.y-hx*du-hz*dv-hxz*(u*dv+v*du);let a=-hxz*du*dv;`,C=` var t=enter;
 let groupOffset=valleyGroundData[15];
 let tileWidth=valleyGroundData[2];let tileHeight=valleyGroundData[3];
 let groupWidth=(tileWidth+3u)/4u;
 let groupCount=groupWidth*((tileHeight+3u)/4u);
 let lookupOffset=groupOffset+3u*groupCount;
 let rectangleOffset=lookupOffset+tileWidth*tileHeight;
 let bytesAvailable=arrayLength(&valleyGroundData);
 let groups=groupOffset!=0u&&groupCount!=0u&&bytesAvailable==lookupOffset;
 let rectangles=groupOffset!=0u&&groupCount!=0u&&bytesAvailable>=rectangleOffset&&(bytesAvailable-rectangleOffset)%5u==0u;
 var activeGroup=0u;
 var plateau=0u;
 var plateauBase=0.;var plateauHeight=0.;`,V=`
  if(groups||rectangles){
   var cell=vec2i(0);
   var record=0u;
   if(rectangles){
    let id=valleyGroundData[lookupOffset+u32(tile.y)*tileWidth+u32(tile.x)];
    if(id!=0u&&id<=(bytesAvailable-rectangleOffset)/5u){record=rectangleOffset+(id-1u)*5u;}
   }else{
    cell=tile/4;
    record=groupOffset+u32(cell.y)*groupWidth+u32(cell.x)+2u*groupCount;
   }
   if(record!=activeGroup){
    activeGroup=record;
    plateau=0u;
    var groupLow=vec2f(0);var groupHigh=vec2f(0);
    if(record!=0u){
     if(rectangles){
      // Residency publication zeros the representative of any rectangle
      // containing an absent tile, even if the current tile remains resident.
      plateau=valleyGroundData[record];
      groupLow=vec2f(f32(valleyGroundData[record+1u]),f32(valleyGroundData[record+2u]));
      groupHigh=vec2f(f32(valleyGroundData[record+3u]),f32(valleyGroundData[record+4u]));
     }else{
      let representative=valleyGroundData[record];
      plateau=select(0u,representative,bitcast<f32>(valleyGroundData[record-2u*groupCount])>=0.);
      groupLow=vec2f(cell*4);groupHigh=groupLow+vec2f(4.);
     }
    }
    if(plateau!=0u){
     let word=valleyGroundData[valleyGroundData[plateau]];
     plateauHeight=-.25+(32767.5-f32(word&65535u))/bitcast<f32>(valleyGroundData[12])-bitcast<f32>(valleyGroundData[13]);
     let tread=(f32(valleyGroundData[plateau+2u]&15u)-4.)*.125;
     plateauBase=1.+bitcast<f32>(valleyGroundData[plateau+1u])+tread;
     // Skip a whole remaining segment only when its boundary and both prior
     // quarter ownership samples are inside the same complete plateau.
     if(exit>=t&&exit<=256.&&all(abs(d)<=vec3f(4.))&&all(abs(o)<=vec3f(8192.))){
      let localStart=p.xz-low.xz;
      let finish=o+d*exit;
      let localEnd=finish.xz-low.xz;
      let pad=vec2f(.002)+.000002*(abs(o.xz)+abs(low.xz)+max(abs(d.xz*t),abs(d.xz*exit)));
      let yPad=.002+.000002*(abs(o.y)+max(abs(d.y*t),abs(d.y*exit)));
      if(all(min(localStart,localEnd)>groupLow+pad)&&all(max(localStart,localEnd)<groupHigh-pad)){
       let below=max(p.y,finish.y)-plateauBase-plateauHeight< -yPad;
       let above=min(p.y,finish.y)-plateauBase-plateauHeight>yPad;
       if(above||(openCut&&below)){return ValleyGroundHit(-1.,vec3f(0),0u);}
      }
     }
    }
   }
  }
  var surfacePatch:ValleySculptPatch;
  var a=0.;var b=d.y;var c:f32;
  if(plateau!=0u){
   // Keep the canonical subtraction order and DDA start time. Merging the
   // heights first or solving from a different point can change hit bits.
   c=p.y-plateauBase-plateauHeight;
  }else{
   surfacePatch=valleySculptPatch(p.xz,d.xz);let h=surfacePatch.h;let u=surfacePatch.uv.x;let v=surfacePatch.uv.y;
   let hx=h.y-h.x;let hz=h.z-h.x;let hxz=h.w-h.y-h.z+h.x;let du=d.x*15.;let dv=d.z*15.;
   c=p.y-surfacePatch.base-h.x-hx*u-hz*v-hxz*u*v;b=d.y-hx*du-hz*dv-hxz*(u*dv+v*du);a=-hxz*du*dv;
  }`,x="if(!openCut&&c<=.000002){return ValleyGroundHit(t,select(valleySculptNormal(surfacePatch),normal,c<-.000002),valleySculptMaterial(surfacePatch));}";function b(e){if(!e.includes("fn valleySculptRef("))return e;const t=e.indexOf("fn valleyGroundTrace("),l=e.indexOf("fn valleyGroundRay(",t);if(t<0||l<0)throw Error("Valley flat group trace changed");let a=e.slice(t,l);for(const[r,n]of[[" var t=enter;",C],[T,V],[x,x.replace("{return","{if(plateau!=0u){surfacePatch=valleySculptPatch(p.xz,d.xz);}return")]]){const i=a.indexOf(r);if(i<0||a.indexOf(r,i+r.length)>=0)throw Error("Valley flat group traversal anchor changed");a=a.slice(0,i)+n+a.slice(i+r.length)}return e.slice(0,t)+a+e.slice(l)}const k=`
fn valleyFlatJump(o:vec3f,d:vec3f,p:vec3f,low:vec3f,t:f32,exit:f32,tile:vec2i,record:u32)->vec3f{
 let representative=valleyGroundData[record];
 if(representative==0u){return vec3f(0);}
 let axis=select(2u,0u,abs(d.x)>=abs(d.z));
 let across=2u-axis;
 let tileAxis=axis/2u;
 let highDirection=d[axis]>0.;
 let end=o+d*exit;
 let pad=.002;
 // Leave the last rectangle tile to the original traversal. Also leave a
 // margin before the current slab/band exit, even when that comes earlier.
 let lowFace=f32(valleyGroundData[record+1u+tileAxis]+1u);
 let highFace=f32(valleyGroundData[record+3u+tileAxis]-1u);
 let endAxis=end[axis]-low[axis];
 let face=select(max(lowFace,ceil(endAxis+pad)),min(highFace,floor(endAxis-pad)),highDirection);
 let current=f32(tile[tileAxis]);
 let crossed=select(current+1.-face,face-current,highDirection);
 if(crossed<3.){return vec3f(0);}
 let advance=(low[axis]+face-o[axis])/d[axis];
 if(!(advance>t&&advance<exit)){return vec3f(0);}
 let finish=o+d*advance;
 let along=vec2f(p[across],finish[across])-low[across]-f32(tile[across/2u]);
 // No competing perpendicular face and no near-corner ordering ambiguity.
 if(!(all(along>vec2f(pad))&&all(along<vec2f(1.-pad)))){return vec3f(0);}
 // The tighter reference roundoff bound keeps intermediate reconstructed
 // faces within the original .0002 DDA ownership bias.
 if(!all(abs(o.xz)<=vec2f(256.))||!all(abs(low.xz)<=vec2f(256.))||
    !all(abs(d.xz*advance)<=vec2f(256.))||!all(abs(finish.xz-low.xz)<=vec2f(256.))){return vec3f(0);}
 let first=valleySculptNext(o[axis],d[axis],low[axis],current,1.);
 if(!(first>t&&first==valleySculptNextReference(o[axis],p[axis],d[axis],low[axis],1.))){return vec3f(0);}
 let top=bitcast<f32>(valleyGroundData[representative+5u]);
 let heightPad=pad+.000002*(abs(o.y)+max(abs(d.y*t),abs(d.y*advance)));
 if(!(top>=0.&&min(p.y,finish.y)>top+heightPad)){return vec3f(0);}
 return vec3f(advance,crossed,f32(axis));
}
`,o="  let tile=valleySculptTile(p.xz,d.xz);let at=valleySculptRef(tile);",B=`
  // The retry's smaller ownership bias needs its existing per-tile progress
  // checks. Only the reference walk uses this guarded rectangle jump.
  if(reference&&rectangles&&exit<=256.&&(exit-t)*max(abs(d.x),abs(d.z))>=3.){
   let id=valleyGroundData[lookupOffset+u32(tile.y)*tileWidth+u32(tile.x)];
   if(id!=0u&&id<=(bytesAvailable-rectangleOffset)/5u){
    let jump=valleyFlatJump(o,d,p,low,t,exit,tile,rectangleOffset+(id-1u)*5u);
    if(jump.y>0.){
     let axis=u32(jump.z);
     t=jump.x;normal=vec3f(0);normal[axis]=-sign(d[axis]);
     openCut=false;stalled=0u;
     iteration+=u32(jump.y)-1u;
     continue;
    }
   }
  }`;function M(e){if(!e.includes("fn valleySculptRef("))return e;const t=e.indexOf("fn valleyGroundTrace("),l=e.indexOf("fn valleyGroundRay(",t),a=e.indexOf(o,t);if(t<0||a<t||a>=l||e.indexOf(o,a+o.length)>=0||!e.slice(t,a).includes("let rectangles="))throw Error("Valley flat jump requires the grouped terrain traversal");const r=a+o.length;return e.slice(0,t)+k+e.slice(t,r)+B+e.slice(r)}const g=" if(!valleyBandGroupBelow(offset,width,first,rayHeight)){return false;}",R=`
 if(all(span==vec2u(0u))){
  let index=offset+first.y*width+first.x;
  let groupTop=bitcast<f32>(valleyGroundData[index]);
  if(groupTop>=0.&&rayHeight>groupTop){return 1u;}
  if(!(groupTop>=0.&&minimum>0.)||abs(d.x)+abs(d.z)<1e-10||
     !all(abs(d)<=vec3f(4.))||!all(abs(o)<=vec3f(8192.))){return 0u;}
  let dimensions=vec2u(valleyGroundData[2],valleyGroundData[3]);
  let groupOrigin=first*4u;
  if(!all(groupOrigin+vec2u(4u)<=dimensions)){return 0u;}
  let count=width*((dimensions.y+3u)/4u);
  if(count==0u||arrayLength(&valleyGroundData)!=offset+2u*count){return 0u;}
  let bottom=bitcast<f32>(valleyGroundData[index+count]);
  if(!(bottom>=0.&&groupTop>=bottom)){return 0u;}
  // Enlarge the shared endpoints to cover the buried trace's extra parameter
  // allowance and its different subtraction order. Padding also stays strictly
  // inside the group and farther from the slab edge than the residency cut.
  let extra=vec2f(.003)+.000003*(abs(o.xz)+abs(low)+max(abs(startOffset.xz),abs(endOffset.xz)))+abs(d.xz)*.00003;
  let groupLow=vec2f(groupOrigin);
  if(!(all(footprintMin-extra>groupLow)&&all(footprintMax+extra<groupLow+vec2f(4.)))){return 0u;}
  let verticalError=.003+.000003*(abs(o.y)+max(abs(startOffset.y),abs(endOffset.y)))+abs(d.y)*.00003;
  let derivative=bitcast<f32>(valleyGroundData[14]);
  let buriedPadding=padding+extra;
  let high=max(start.y,end.y)+verticalError+2.*max(buriedPadding.x,buriedPadding.y)*derivative;
  if(min(start.y,end.y)>verticalError&&high<min(bottom,valleyGroundTop())){return 2u;}
  return 0u;
 }
`;function s(e,t,l){const a=e.indexOf(t);if(a<0||e.indexOf(t,a+t.length)>=0)throw Error("Valley height interval traversal anchor changed");return e.slice(0,a)+l+e.slice(a+t.length)}function m(e){if(!e.includes("fn valleySculptRef("))return e;const t="fn valleyBandAboveGround(o:vec3f,d:vec3f,minimum:f32,limit:f32)->bool{",l="fn valleyGroundRayRange(",a=e.indexOf(t),r=e.indexOf(l,a);if(a<0||r<0)throw Error("Valley height interval traversal anchor changed");const n="return !all(span==vec2u(1u))||valleyBandGroupBelow(offset,width,last,rayHeight);";let i=e.slice(a,r).replace(t,"fn valleyBandHeightInterval(o:vec3f,d:vec3f,minimum:f32,limit:f32)->u32{").replaceAll("return false;","return 0u;");i=s(i,g.replace("false","0u"),R+g.replace("false","0u")),i=s(i,n,"return select(0u,1u,!all(span==vec2u(1u))||valleyBandGroupBelow(offset,width,last,rayHeight));");const w=" if(!referenceOnly&&valleyBandAboveGround(o,d,minimum,limit)){return ValleyGroundHit(-1.,vec3f(0),0u);}",f=" return valleyGroundTrace(o,d,minimum,min(limit,256.),false,top);";let u=s(e.slice(r),w,` var bandInterval=0u;
 if(!referenceOnly){bandInterval=valleyBandHeightInterval(o,d,minimum,limit);}
 if(bandInterval==1u){return ValleyGroundHit(-1.,vec3f(0),0u);}`);return u=s(u,f,` if(bandInterval==2u){return ValleyGroundHit(-1.,vec3f(0),0u);}
`+f),e.slice(0,a)+i+u}const c="  let quarter=vec2f(tile*4+valleySculptCell(local,d.xz,4.));",j=`
  if(!reference&&openCut&&flat){
   // The flat flag means all 256 nodes have the same height code. The
   // original quadratic reduces to c + d.y * s on this entire quarter.
   let base=1.+bitcast<f32>(valleyGroundData[at+1u])+valleySculptQuarter(at,local,d.xz);
   let gap=p.y-base-valleySculptNode(at,vec2i(0)).x;
   if(gap<-.000002){
    let quarterX=valleySculptNext(o.x,d.x,low.x,quarter.x,4.);
    let quarterZ=valleySculptNext(o.z,d.z,low.z,quarter.y,4.);
    let quarterEnd=min(exit,min(quarterX,quarterZ));
    let rise=d.y*max(0.,quarterEnd-t);
    // Keep both endpoints below the open-cut and root acceptance tolerances.
    let margin=.000002+.00002*abs(d.y)+.000001*(abs(gap)+abs(rise));
    if(max(gap,gap+rise)<-margin){
     // A quarter boundary exactly at the band clip can expose a real face.
     if(!(bandClip&&t==enter&&(-valleySculptNext(o.x,-d.x,low.x,quarter.x,4.)==t||
                               -valleySculptNext(o.z,-d.z,low.z,quarter.y,4.)==t))){
      if(quarterEnd>=exit){break;}
      // Use the same progress, iteration budget and incoming face normal.
      if(quarterEnd<=t+.0000001){
       stalled+=1u;t=valleySculptProgress(t);if(stalled>=4u){break;}
       continue;
      }
      stalled=0u;t=quarterEnd;
      normal=select(vec3f(0,0,-sign(d.z)),vec3f(-sign(d.x),0,0),quarterX<=quarterZ);
      continue;
     }
    }
   }
  }`;function q(e){const t=e.indexOf(c);if(!e.includes("fn valleyBandAboveGround(")||t<0||e.indexOf(c,t+c.length)>=0)throw Error("Unknown Valley bandHeight retry shader");const l=t+c.length;return e.slice(0,l)+j+e.slice(l)}const d="  return Vertex(vec4f(p,0,1),p,i);",A=`
struct ValleyTerrainProxy {
 lo:vec4f,
 hi:vec4f,
 first:vec4f,
 far:f32,
}

// Evaluate the four signed viewport planes at each prism corner. A perspective
// ray intersects a plane only if the corresponding homogeneous signs allow it.
fn valleyTerrainProxyPoint(bounds:ValleyTerrainProxy,xy:vec2f,w:f32,guard:vec2f)->ValleyTerrainProxy{
 let q=vec4f(xy,-xy);
 let error=vec4f(guard,guard);
 var result=bounds;
 result.first=min(result.first,q-vec4f(w));
 result.far=max(result.far,w);
 if(w>.05){
  result.lo=max(result.lo,(q+error)/w);
 }else{
  // Near or behind the eye, every vertex must still satisfy q <= limit*w.
  // For uncertain W close to zero, only accept a plane when the whole
  // viewport's worth of candidate limits leaves this vertex on its far side.
  let limit=select((q+error)/min(w,-.05),select(vec4f(-2),vec4f(2),q+error+abs(w)<vec4f(0)),w>=-.05);
  result.hi=min(result.hi,limit);
 }
 return result;
}

fn valleyTerrainProxyPair(bounds:ValleyTerrainProxy,xz:vec2f,depth:f32,heights:vec2f,bend:vec2f,
 lens:vec2f,distance:f32,guard:vec2f)->ValleyTerrainProxy{
 let relative=xz-view.at.xz;
 let y=heights+vec2f(bend.x*depth+bend.y-view.at.y);
 let horizontal=vec2f(dot(view.right.xz,relative),dot(view.up.xz,relative));
 let vertical=vec2f(view.right.y,view.up.y);
 let w=distance-dot(view.back.xz,relative);
 let a=valleyTerrainProxyPoint(bounds,(horizontal+vertical*y.x)*lens,w-view.back.y*y.x,guard);
 return valleyTerrainProxyPoint(a,(horizontal+vertical*y.y)*lens,w-view.back.y*y.y,guard);
}

fn valleyTerrainProxyRect(obj:Item,m:f32,b:f32)->vec4f{
 let full=vec4f(-1,-1,1,1);
 let empty=vec4f(2,2,-2,-2);
 let distance=-view.back.w;
 let lens=vec2f(distance)/vec2f(view.right.w,view.up.w);
 let axis=view.bend.xy;
 let residentLow=valleyGroundLow();
 let residentSize=valleyGroundSize();
 let residentHigh=residentLow+residentSize;
 let scale=1.+distance+dot(abs(view.at.xyz)+abs(obj.center.xyz)+obj.extent.xyz,vec3f(1))+
  dot(abs(residentLow)+abs(residentHigh),vec2f(1))+abs(view.bend.z)+abs(b)+abs(m)*max(abs(obj.band.x),abs(obj.band.y));
 if(!(distance>=1.&&distance<=256.&&scale<8192.&&abs(m)<=8.&&obj.band.x<=obj.band.y&&
    all(lens>=vec2f(.0625))&&all(lens<=vec2f(16))&&all(view.viewport.xy>=vec2f(1))&&all(residentSize>vec2f(0)))){return full;}

 // Match the accepted record, trace slab (whose origin is one metre higher),
 // and optional fragment range. Allow for hit acceptance and FP32 ray math.
 let pad=.0005+.000004*(scale+256.);
 let guard=pad*(vec2f(1)+lens);
 var low=max(residentLow,obj.center.xz-obj.extent.xz);
 var high=min(residentHigh,obj.center.xz+obj.extent.xz);
 if(view.viewport.z>0.){
  low=max(low,view.at.xz-vec2f(view.viewport.z));
  high=min(high,view.at.xz+vec2f(view.viewport.z));
 }
 low-=vec2f(pad);high+=vec2f(pad);
 let heights=vec2f(max(-1.,obj.center.y-obj.extent.y)-pad,min(valleyGroundTop()-1.,obj.center.y+obj.extent.y)+pad);
 if(any(low>high)||heights.x>heights.y){return empty;}

 // Clip the XZ rectangle to the two packed strip planes. The convex
 // footprint consists of included corners and the edge/plane intersections.
 let polygon=array<vec2f,4>(low,vec2f(high.x,low.y),high,vec2f(low.x,high.y));
 let band=obj.band.xy+vec2f(-pad,pad);
 let bend=vec2f(m,b);
 var bounds=ValleyTerrainProxy(vec4f(-1),vec4f(2),vec4f(1e20),-1e20);
 for(var j=0u;j<4u;j++){
  let a=polygon[j];let z=polygon[(j+1u)%4u];
  let aDepth=dot(a,axis)+view.bend.z;
  let zDepth=dot(z,axis)+view.bend.z;
  if(aDepth>=band.x&&aDepth<=band.y){
   bounds=valleyTerrainProxyPair(bounds,a,aDepth,heights,bend,lens,distance,guard);
  }
  for(var k=0u;k<2u;k++){
   let depth=band[k];
   if(depth>min(aDepth,zDepth)&&depth<max(aDepth,zDepth)){
    let xz=mix(a,z,(depth-aDepth)/(zDepth-aDepth));
    bounds=valleyTerrainProxyPair(bounds,xz,depth,heights,bend,lens,distance,guard);
   }
  }
 }
 let planeGuard=vec4f(guard,guard);
 if(bounds.far < -pad||any(bounds.first>planeGuard)){return empty;}
 // Validate proposed screen edges against the near/behind-eye vertices before
 // using them. A failed edge retains full viewport coverage on that side.
 let limit=select(vec4f(1),bounds.lo,bounds.lo<=bounds.hi);
 let margin=vec2f(2)/view.viewport.xy+vec2f(.00005);
 return clamp(vec4f(-limit.zw-margin,limit.xy+margin),vec4f(-1),vec4f(1));
}
`;function E(e){const l=e.indexOf("@vertex fn vertex("),a=e.indexOf(d,l);if(l<0||a<0||e.indexOf(d,a+d.length)>=0||!e.includes("fn valleyBandAboveGround(")||!e.includes("fn valleyGroundTop()->f32")||!e.includes("var originalLo=mid-size;var originalHi=mid+size;")||e.includes("fn valleyTerrainProxyRect("))throw Error("Unknown Valley bandHeight terrain vertex bounds");return e.slice(0,l)+A+e.slice(l,a)+`  if(view.back.w<0.&&view.bend.w>0.&&obj.origin.w==0.){
    let rect=valleyTerrainProxyRect(obj,m,b);
    let lo=max(originalLo,rect.xy);let hi=min(originalHi,rect.zw);
    if(any(lo>hi)){return Vertex(vec4f(2,2,0,1),vec2f(2),i);}
    p=mix(lo,hi,.5+.5*corners[v]);
  }
`+e.slice(a)}const L=`
fn valleyRangeMiss(o:vec3f,d:vec3f,minimum:f32,limit:f32)->bool{
 let offset=valleyGroundData[15];
 let dimensions=vec2u(valleyGroundData[2],valleyGroundData[3]);
 let groups=(dimensions+3u)/4u;
 let count=groups.x*groups.y;
 if(offset==0u||arrayLength(&valleyGroundData)!=offset+2u*count||
    !(minimum>0.&&limit>=minimum&&limit<=256.)||abs(d.x)+abs(d.z)<1e-10){return false;}
 let a=d*minimum;
 let b=d*limit;
 let low=valleyGroundLow();
 let error=vec3f(.003)+.000004*(abs(o)+max(abs(a),abs(b))+vec3f(abs(low.x),0.,abs(low.y)))+.00004*abs(d);
 let first=o+min(a,b)-error;
 let last=o+max(a,b)+error;
 // Side entries at a resident boundary have vertical faces reaching the base.
 if(any(first.xz<=low)||any(last.xz>=low+vec2f(dimensions))){return false;}
 let begin=vec2u((first.xz-low)*.25);
 let end=vec2u((last.xz-low)*.25);
 if(any(end-begin>vec2u(7u))){return false;}
 // Include extrapolation at biased patch ownership ties.
 let pad=2.*max(error.x,error.z)*bitcast<f32>(valleyGroundData[14]);
 var above=true;
 var buried=first.y>0.&&last.y<valleyGroundTop();
 for(var z=begin.y;z<=end.y;z++){
  for(var x=begin.x;x<=end.x;x++){
   let at=offset+z*groups.x+x;
   let top=bitcast<f32>(valleyGroundData[at]);
   let bottom=bitcast<f32>(valleyGroundData[at+count]);
   above=above&&top>=0.&&first.y-pad>top;
   buried=buried&&bottom>=0.&&top>=bottom&&last.y+pad<bottom;
   if(!above&&!buried){return false;}
  }
 }
 return above||buried;
}
`;function N(e){const t="fn valleyGroundRayRange(",l="if(!referenceOnly&&valleyBandAboveGround(o,d,minimum,limit))";if(!e.includes(t)||!e.includes(l))throw Error("Missing terrain band bounds in camera shader");return e.replace(t,L+t).replace(l,"if(!referenceOnly&&(valleyBandAboveGround(o,d,minimum,limit)||valleyRangeMiss(o,d,minimum,limit)))")}const F=`
@group(1) @binding(10) var valleyHeightMips:texture_2d_array<f32>;
override valleyMipFootprintScale:f32=1.;

fn valleyMipCells(level:i32)->i32{return min(15,16>>u32(level));}
fn valleyMipCell(uv:vec2f,d:vec2f,n:i32)->vec2i{
 return clamp(vec2i(floor(uv*f32(n)+sign(d)*.0001)),vec2i(0),vec2i(n-1));
}
fn valleyMipHeight(uv:vec2f,layer:i32,level:i32)->f32{
 let n=valleyMipCells(level);
 let p=uv*f32(n);let cell=clamp(vec2i(floor(p)),vec2i(0),vec2i(n-1));
 return valleySculptMix(textureLoad(valleyHeightMips,cell,layer,level),p-vec2f(cell));
}
// Distance -2 requests the original intersection for this strip.
fn valleyMipRay(o:vec3f,d:vec3f,minimum:f32,limit:f32)->ValleyGroundHit{
 let fallback=ValleyGroundHit(-2.,vec3f(0),0u);
 let miss=ValleyGroundHit(-1.,vec3f(0),0u);
 if(view.back.w>=0.||view.viewport.y<=0.){return fallback;}
 let footprint=valleyMipFootprintScale*2.*view.up.w/(-view.back.w*view.viewport.y);
 // Even a grazing surface stays detailed at sufficiently close range.
 if(limit*footprint*15.*4.<1.5){return fallback;}
 let lo=vec3f(valleyGroundLow().x,0.,valleyGroundLow().y);
 let hi=vec3f(lo.x+valleyGroundSize().x,valleyGroundTop(),lo.z+valleyGroundSize().y);
 var start=minimum;var finish=limit;
 for(var axis=0u;axis<3u;axis++){
  if(abs(d[axis])<1e-10){
   if(o[axis]<lo[axis]||o[axis]>hi[axis]){return miss;}
  }else{
   let a=(lo[axis]-o[axis])/d[axis];let b=(hi[axis]-o[axis])/d[axis];
   start=max(start,min(a,b));finish=min(finish,max(a,b));
  }
 }
 if(start>finish){return miss;}
 let entry=o+d*start;
 // Preserve the original closed outer walls, open residency cuts and base.
 if(any(entry.xz<=lo.xz+.001)||any(entry.xz>=hi.xz-.001)||entry.y<.001){return fallback;}
 var t=start;var outside=entry.y>=hi.y-.00001;
 var face=vec3f(0,1,0);var oldTile=vec2i(-1);
 var layer=0i;var level=0i;var blend=0.;var n=1i;var base=0.;var eligible=false;
 for(var step=0;step<512;step++){
  let p=o+d*t;let tile=valleySculptTile(p.xz,d.xz);let at=valleySculptRef(tile);
  let tileTop=bitcast<f32>(valleyGroundData[at+5u]);
  let tx=valleySculptNext(o.x,d.x,lo.x,f32(tile.x),1.);
  let tz=valleySculptNext(o.z,d.z,lo.z,f32(tile.y),1.);
  let tileEnd=min(finish,min(tx,tz));
  if(tileTop<0.){return fallback;}
  var until=tileEnd;var cross=vec2f(tx,tz);
  if(min(p.y,o.y+d.y*tileEnd)>tileTop+.0001){outside=true;}
  else{
   if(any(tile!=oldTile)){
    oldTile=tile;
    layer=i32((valleyGroundData[at]-valleyGroundData[9])/256u);
    eligible=layer>=0&&layer<256&&valleySculptCornerMask(at)==0u&&
     valleyGroundData[at+2u]==0x44444444u&&valleyGroundData[at+3u]==0x44444444u;
    if(!eligible){return fallback;}
    let corners=textureLoad(valleyHeightMips,vec2i(0),layer,4);
    if(corners.x < -1e8){return fallback;}
    base=1.+bitcast<f32>(valleyGroundData[at+1u]);
    let normal=normalize(vec3f(.5*(corners.x+corners.z-corners.y-corners.w),1.,.5*(corners.x+corners.y-corners.z-corners.w)));
    // Use one depth per tile so both sides of a cell see the same morph.
    let center=vec3f(lo.x+f32(tile.x)+.5,base+dot(corners,vec4f(.25)),lo.z+f32(tile.y)+.5);
    let depth=max(0.,dot(center-o,d)/dot(d,d));
    let incidence=max(.25,abs(dot(normal,normalize(d))));
    let lod=clamp(log2(max(.001,15.*footprint*depth/(1.5*incidence))),0.,4.);
    if(lod<=0.){return fallback;}
    level=i32(floor(lod));blend=fract(lod);n=valleyMipCells(level);
   }
   let uv=clamp(p.xz-lo.xz-vec2f(tile),vec2f(0),vec2f(1));let cell=valleyMipCell(uv,d.xz,n);
   let nc=f32(n);let grid=vec2f(tile*n+cell);
   cross=vec2f(valleySculptNext(o.x,d.x,lo.x,grid.x,nc),valleySculptNext(o.z,d.z,lo.z,grid.y,nc));
   until=min(tileEnd,min(cross.x,cross.y));
   var h=textureLoad(valleyHeightMips,cell,layer,level);
   if(blend>0.){
    let low=vec2f(cell)/nc;let high=vec2f(cell+vec2i(1))/nc;let next=level+1;
    h=mix(h,vec4f(valleyMipHeight(low,layer,next),valleyMipHeight(vec2f(high.x,low.y),layer,next),
       valleyMipHeight(vec2f(low.x,high.y),layer,next),valleyMipHeight(high,layer,next)),blend);
   }
   let local=uv*nc-vec2f(cell);let du=d.x*nc;let dv=d.z*nc;
   let hx=h.y-h.x;let hz=h.z-h.x;let twist=h.w-h.z-h.y+h.x;
   let c=p.y-base-valleySculptMix(h,local);
   let b=d.y-hx*du-hz*dv-twist*(du*local.y+dv*local.x);let a=-twist*du*dv;
   let duration=max(0.,until-t);
   if(c>0.000002){outside=true;}
   if(outside&&c < -.000002){return ValleyGroundHit(t,face,0u);}
   // Band start inside a column is an artificial cut. Let the exact solver
   // disambiguate a real wall coincident with that cut.
   if(t==start&&!outside&&c<0.&&any(abs(uv-round(uv))<vec2f(.00002))){return fallback;}
   var root=valleySculptRoot(a,b,c,duration);
   if(root<1e19&&b+2.*a*root>0.){
    let reverse=valleySculptRoot(a,-b-2.*a*duration,c+b*duration+a*duration*duration,duration);
    root=1e20;
    if(reverse<1e19&&b+2.*a*(duration-reverse)<0.){root=duration-reverse;}
   }
   if(root<1e19){
    let hitUV=local+vec2f(du,dv)*root;
    let normal=normalize(vec3f(-nc*(hx+twist*hitUV.y),1.,-nc*(hz+twist*hitUV.x)));
    return ValleyGroundHit(t+root,normal,0u);
   }
   outside=(a*duration+b)*duration+c>0.;
  }
  if(until>=finish){return miss;}
  if(until<=t){return fallback;}
  face=select(vec3f(0,0,-sign(d.z)),vec3f(-sign(d.x),0,0),cross.x<=cross.y);t=until;
 }
 return fallback;
}
`;function I(e){const t="fn valleyGroundRayRange(",l=" let previous=valleyGroundTrace(o,d,0.,limit,true,top);";if(!e.includes(t)||!e.includes(l))throw Error("Missing sculpted camera range");return e.replace(t,F+t).replace(l,` if(!referenceOnly){let coarse=valleyMipRay(o,d,minimum,limit);if(coarse.distance>=-1.){return coarse;}}
`+l)}function K(e,t){switch(t){case"heightMip":return I(e);case"rangeBounds":return N(e);case"retrySkip":return q(e);case"terrainProxy":return E(e);case"preBandRetry":return p(e,!0);case"buriedRetry":return p(e);case"boundedStrips":return v(y(e));case"flatTreads":return O(e);case"flatGroups":case"flatRectangles":return b(e);case"coarseBands":return z(e);case"flatJump":return M(b(e));case"heightInterval":return m(e);case"boundedInterval":return v(y(m(e)))}}export{K as applyCameraHeightTrial};
