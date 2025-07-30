import { Suspense } from 'react';
import { Environment, OrbitControls, Torus } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";

import Jar from './Jar.jsx';
import Beans from './Beans.jsx'
import { PlaneGeometry } from 'three';

const App = () => {
  return (
    <Canvas camera={{ position: [0, 0, 3], near: 0.01, far: 10000 }}>
          <Suspense>
                <Environment preset="apartment" background />
                <OrbitControls />
                <Physics>
                 
                  <Beans/>
                  
                  <RigidBody type="fixed">
                      <mesh rotation-x={-Math.PI / 2} position={[0, -10, 0]}><planeGeometry args={[1000, 1000]}/><meshStandardMaterial opacity={0.5}/></mesh>
                      <mesh rotation-x={Math.PI / 2} position={[0, -10, 0]}><planeGeometry args={[1000, 1000]}/><meshStandardMaterial opacity={0.5}/></mesh>
                      
                      <mesh position={[-38, 0, 0]}><boxGeometry args={[1, 300, 100]} /> <meshStandardMaterial transparent opacity={0}/> </mesh>
                      <mesh position={[38, 0, 0]}><boxGeometry args={[1, 300, 100]} /> <meshStandardMaterial transparent opacity={0}/> </mesh>
                      
                      <mesh position={[0, 0, -38]}><boxGeometry args={[100, 300, 1]}  /> <meshStandardMaterial transparent opacity={0}/> </mesh>
                      <mesh position={[0, 0, 38]}><boxGeometry args={[100, 300, 1]}  /> <meshStandardMaterial transparent opacity={0}/> </mesh>
                  </RigidBody>
                </Physics>
          </Suspense>
          
    </Canvas>
  );
};
{/*
           <RigidBody colliders={"hull"} restitution={2}>
                <Torus />
            </RigidBody>
            

          <CuboidCollider position={[0, -2, 0]} args={[20, 0.5, 20]} />
        </Physics>*/}

export default App