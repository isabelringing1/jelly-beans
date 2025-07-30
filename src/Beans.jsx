import { InstancedRigidBodies, RapierRigidBody } from "@react-three/rapier";
import { useRef, useEffect, useMemo } from "react";

const COUNT = 500;

const Beans = () => {
    const rigidBodies = useRef<Array[RapierRigidBody]>(null);
  
    useEffect(() => {
      if (!rigidBodies.current) {
        return;
      }

      // Or update all instances
      rigidBodies.current.forEach((api) => {
        api.applyImpulse({ x: 0, y: 10, z: 0 }, true);
      });
    }, []);
  
    // We can set the initial positions, and rotations, and scales, of
    // the instances by providing an array of InstancedRigidBodyProps
    // which is the same as RigidBodyProps, but with an additional "key" prop.
    const instances = useMemo(() => {
      const instances = [];
  
      for (let i = 0; i < COUNT; i++) {
        instances.push({
            key: "instance_" + i,
            position: [0, 0, 0],
            rotation: [Math.random(), Math.random(), Math.random()]
        });
      }
  
      return instances;
    }, []);
  
    return (
        <InstancedRigidBodies
            ref={rigidBodies}
            instances={instances}
            colliders="ball"
            scale={1}
            position={[0, 5, 0]}
        >
            <instancedMesh args={[undefined, undefined, COUNT]} count={COUNT}>
                <boxGeometry args={[3, 3, 3]}/>
                <meshStandardMaterial
                opacity={1}
                color={0xffaaaa}
                />
            </instancedMesh>
        </InstancedRigidBodies>
      );
};
  
export default Beans;