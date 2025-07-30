import { useGLTF } from '@react-three/drei'
import { useControls } from 'leva'

export function Jar(props) {
    const { nodes, materials } = useGLTF('/jar2.glb')
    console.log(materials)
    
    return (
        <group {...props} dispose={null}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Mesh.geometry}
            material={materials.Material_0}
                scale={1}
                position={[0, -10, 0]}
            transparent
            >
            </mesh>
        </group>
      )
  }
  
  useGLTF.preload('/jar2.glb')
export default Jar;