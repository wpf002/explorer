import { AdditiveBlending, BackSide, Group, Mesh, Scene, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

const VERT = /* glsl */`
varying vec3 vN,vP;varying vec2 vUv;
void main(){vN=normalize(mat3(modelMatrix)*normal);vP=(modelMatrix*vec4(position,1.)).xyz;vUv=uv;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}`;

const BODY_FRAG = /* glsl */`
varying vec3 vN,vP;varying vec2 vUv;uniform vec3 sunDir;
void main(){
  float y=vUv.y; float wob=sin(vUv.x*18.0+y*30.0)*0.012;
  float b=sin((y+wob)*38.0+sin(y*11.0)*2.2)*0.5+0.5; float b2=sin((y+wob)*95.0+1.7)*0.5+0.5; float b3=smoothstep(.3,.7,sin(y*7.0+2.0)*0.5+0.5);
  vec3 deep=pow(vec3(0.16,0.28,0.55),vec3(2.2)), pale=pow(vec3(0.70,0.78,0.90),vec3(2.2)), ink=pow(vec3(0.07,0.13,0.30),vec3(2.2));
  vec3 c=mix(deep,pale,b*0.75); c=mix(c,ink,b2*0.3); c=mix(c,pale,b3*0.35);
  vec3 N=normalize(vN); float diff=max(dot(N,sunDir),0.0); float term=smoothstep(-0.15,0.35,dot(N,sunDir));
  vec3 V=normalize(cameraPosition-vP); float rim=pow(1.0-max(dot(N,V),0.0),3.5);
  vec3 o=c*(0.02+diff*1.0)+pow(vec3(0.45,0.66,1.0),vec3(2.2))*rim*(0.25+term*1.1);
  gl_FragColor=vec4(o,1.0);}`;

const ATM_VERT = /* glsl */`
varying vec3 vN,vP;
void main(){vN=normalize(mat3(modelMatrix)*normal);vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}`;

const ATM_FRAG = /* glsl */`
varying vec3 vN,vP;uniform vec3 sunDir;
void main(){vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vP);float a=pow(max(dot(N,V),0.0),3.0);
  float lit=0.35+0.65*smoothstep(-0.3,0.4,dot(-N,sunDir));
  gl_FragColor=vec4(pow(vec3(0.42,0.62,1.0),vec3(2.2))*a*lit*0.9,1.0);}`;

/** `scale` keeps the planet proportional to the ship: 1 is the 300 m reference. */
export function createPlanet(scene: Scene, sunPos: Vector3, scale = 1): Group {
  const radius = 900 * scale;
  const grp = new Group();
  grp.position.set(980 * scale, -320 * scale, -1500 * scale);
  const sunDir = { value: sunPos.clone().normalize() };
  grp.add(new Mesh(new SphereGeometry(radius, 96, 64), new ShaderMaterial({
    uniforms: { sunDir }, vertexShader: VERT, fragmentShader: BODY_FRAG,
  })));
  grp.add(new Mesh(new SphereGeometry(radius * 1.035, 96, 64), new ShaderMaterial({
    uniforms: { sunDir }, side: BackSide, transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: ATM_VERT, fragmentShader: ATM_FRAG,
  })));
  scene.add(grp);
  return grp;
}
