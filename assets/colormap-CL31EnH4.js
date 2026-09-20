var e=[[33,102,172],[67,200,220],[120,200,80],[250,220,50],[200,30,30]];function t(t,n,r){let i=Math.min(1,Math.max(0,(t-n)/(r-n)))*(e.length-1),a=Math.min(e.length-2,Math.floor(i)),o=i-a,s=e[a],c=e[a+1];return[s[0]+(c[0]-s[0])*o,s[1]+(c[1]-s[1])*o,s[2]+(c[2]-s[2])*o].map(Math.round)}var n=`
vec3 benchColormap(float u) {
  vec3 s0 = vec3(33., 102., 172.) / 255.;
  vec3 s1 = vec3(67., 200., 220.) / 255.;
  vec3 s2 = vec3(120., 200., 80.) / 255.;
  vec3 s3 = vec3(250., 220., 50.) / 255.;
  vec3 s4 = vec3(200., 30., 30.) / 255.;
  float x = clamp(u, 0., 1.) * 4.;
  if (x < 1.) return mix(s0, s1, x);
  if (x < 2.) return mix(s1, s2, x - 1.);
  if (x < 3.) return mix(s2, s3, x - 2.);
  return mix(s3, s4, x - 3.);
}`;export{t as n,n as t};