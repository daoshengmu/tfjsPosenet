
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as posenet from '@tensorflow-models/posenet';
import React from 'react';
import * as RNFS from 'react-native-fs';
import * as jpeg from 'jpeg-js';
import * as FileSystem from 'expo-file-system';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Permissions from 'expo-permissions';
import { GLView } from 'expo-gl';
import { Camera } from 'expo-camera';
import * as ImageManipulator from "expo-image-manipulator";
import { setCanvasSize, contextCreate, renderPoints } from './src/gl.js';

import {
  StyleSheet,
  View,
 // Image,
  Text,
  TouchableOpacity
} from 'react-native';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTfReady: false,
      isPosenetLoaded: false,
      net: null,
      cameraType: Camera.Constants.Type.front,
      hasCameraPermission: false,
      needForceRender: false // Chaning a 
    };

    this.camera = null;
    //this.cameraType = Camera.Constants.Type.front;
    this.frameCount = 0;
   // this.points = null;
  }

  async componentDidMount() {
    // Wait for tf to be ready.
    await tf.ready();
    // Signal to the app that tensorflow.js can now be used.
    this.setState({
      isTfReady: true,
    });

    // const net = await posenet.load({
    //   architecture: 'MobileNetV1',
    //   outputStride: 16,
    //   inputResolution: { width: 640, height: 480 },
    //   multiplier: 0.75
    // });
    // It uses MobileNetV1 by default. (smaller, faster, less accurate)
    const net = await posenet.load();

    if (net) {
      this.setState({
        isPosenetLoaded: true,
        net: net,
      });
      console.log("posenet loaded");
    //  this.loadImage();
    }

    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermission: status === 'granted'
    });
  }

  async loadImage() {
    const url = "file://"+RNFS.DocumentDirectoryPath+'/asset/dog.jpg';
    console.log("image: " +url);

    const imgB64 = await FileSystem.readAsStringAsync(url, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
    const rawImageData = new Uint8Array(imgBuffer);
   
    const TO_UINT8ARRAY = true;
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
    console.log("imageToTensor...width * height" + width, ", " + height);
    const image = {data: data, width: width, height: height};

    let net = this.state.net;

    if (net) {
      const pose = await net.estimateSinglePose(image, {
        flipHorizontal: false
      });
      console.log(pose);
      //var poseData = JSON.stringify(pose);
      let keypoints = pose['keypoints'];
      let points = [];
      keypoints.forEach(key => {
        console.log(key['position']);
        let position = key['position'];
        points.push((position.x / width) * 2.0 - 1.0);
        points.push((position.y / height) * 2.0 - 1.0);
        points.push(0.0);
      });

     // this.setState({points: points}); // TODO: Move to this.points.
    }

    console.log("posenet done checking.");
  }

  takePicture = async () => {
    const { hasCameraPermission } = this.state;
    console.log("takePicture.");
    if (hasCameraPermission && this.camera) {
      console.log("takePicture with camera.");
      // `takePictureAsync()` will cause Android emulator crash.
      let photo = await this.camera.takePictureAsync();
      if (!photo) {
        return;
      }
      console.log("photo url: " + photo.uri);

      const resize = 0.1;
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: {width: photo.width * resize, height: photo.height * resize} }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );

      const imgB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
      const rawImageData = new Uint8Array(imgBuffer);
     
      const TO_UINT8ARRAY = true;
      const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
      console.log("imageToTensor...width * height" + width, ", " + height);
      const image = {data: data, width: width, height: height};

      this.getPoseFromPhoto(image);
    }
  }

  // render(){
  //   const { hasCameraPermission } = this.state
  //   if (hasCameraPermission === null) {
  //     return <View />;
  //   } else if (hasCameraPermission === false) {
  //     return <Text>No access to camera</Text>;
  //   } else {
  //     return (
  //         <View style={{ flex: 1 }}>
  //           <Camera style={{ flex: 1 }} type={this.state.cameraType}>
              
  //           </Camera>
  //       </View>
  //     );
  //   }
  // }

  // image is a object: {data: data, width: width, height: height}
  getPoseFromPhoto = async (image) => {
    let net = this.state.net;

    if (net) {
      const pose = await net.estimateSinglePose(image, {
        flipHorizontal: this.state.cameraType === Camera.Constants.Type.front
      });
      console.log(pose);
      //var poseData = JSON.stringify(pose);
      let keypoints = pose['keypoints'];
      let points = [];
      keypoints.forEach(key => {
        console.log("" + key['part']+": " + key['position'].x + ", " +key['position'].y);
        let position = key['position'];
        points.push((position.x / image.width) * 2.0 - 1.0);
        points.push(((image.height - position.y) / image.height) * 2.0 - 1.0);
        points.push(0.0);
      });
     // this.setState({points: points}); // TODO: Move to this.points.
      // this.points = points;

      renderPoints(points);
      this.forceUpdate();
    }
  }

  render() {
    const { hasCameraPermission } = this.state;

     //++this.frameCount;
      //  (this.forceUpdate());
    // react native only state changes could call render(),
    // An alternative way is calling `this.forceUpdate()`.
    console.log("render...");
    // if (hasCameraPermission === true) {
    //   console.log("ready to capture frames.");
    //   this.takePicture();
    // }
   // renderPoints();

    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Camera style={styles.camera} type={this.state.cameraType} ref={ref => { this.camera = ref;}}>
              <GLView style={styles.GLContainer} pointerEvents="none"
              onContextCreate={contextCreate}
              />
              <View style={{flex:1, flexDirection:"row",justifyContent:"space-between",margin:20}}>
                <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                  onPress={(ref) => {
                    this.takePicture();
                  }}>
                  <FontAwesome
                      name="camera"
                      style={{ color: "#fff", fontSize: 40}}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    alignSelf: 'flex-end',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                  onPress={(ref) => {
                    console.log("MaterialCommunityIcons pressed.");
                    const type = this.state.cameraType === Camera.Constants.Type.back
                      ? Camera.Constants. Type.front
                      : Camera.Constants.Type.back;
                    this.setState({cameraType: type});
                  }}>
                  <MaterialCommunityIcons
                    name="camera-switch"
                    style={{ color: "#fff", fontSize: 40}}
                  />
                </TouchableOpacity>
              </View>
            </Camera>
              {/* {this.setState({needForceRender: true})} */}
            {/* <GLView style={styles.GLContainer}
            onContextCreate={contextCreate}
            /> */}
          </View>
          {/* <View style={{ flex: 1, flexDirection: 'row' }}>
            <TouchableOpacity
              style={{
                flex: 0.1,
                // left: 0,
                // marginLeft: 10,
                // marginTop: 10
              }}
              onPress={(ref) => {
               // this.setCameraType(
                  const type = this.state.cameraType === Camera.Constants.Type.back
                    ? Camera.Constants. Type.front
                    : Camera.Constants.Type.back;
                  this.setState({cameraType: type});
              //  );
              }}>
              <Text style={{ fontSize: 24, color: 'black' }}> Flip </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 0.1,
                // left: 0,
                // marginLeft: 10,
                // marginTop: 10
              }}
              onPress={(ref) => {
                this.takePicture();
              }}>
              <Text style={{ fontSize: 24, color: 'black' }}> Take a Photo </Text>
            </TouchableOpacity>
           </View> */}
        </View>
      );
    }

    // return (
    //   <View stype={styles.cameraContainer}>
    //     {/* <Image source={require("./asset/dog.jpg")}></Image> */}
    //     <Camera
    //       style={styles.camera}
    //       type={this.state.cameraType}
    //       ref={ref => { this.setCamera(ref) }}>
    //         <View style={{
    //             flex: 1,
    //             backgroundColor: 'transparent',
    //             flexDirection: 'row',
    //           }}>
    //           <TouchableOpacity
    //             style={{
    //               flex: 0.1,
    //               alignSelf: 'flex-end',
    //               alignItems: 'center',
    //             }}
    //             onPress={() => {
    //               setType(
    //                 type === Camera.Constants.Type.back
    //                   ? Camera.Constants.Type.front
    //                   : Camera.Constants.Type.back
    //               );
    //             }}>
    //             <Text style={{ fontSize: 18, marginBottom: 10, color: 'white' }}> Flip </Text>
    //           </TouchableOpacity>
    //         </View>
    //     </Camera>
    //     {/* <GLView style={styles.GLContainer}
    //       onContextCreate={contextCreate}
    //     /> */}
    //   </View>
    // );
  }
}

const styles = StyleSheet.create({
  MainContainer: {
   width: 300,
   height: 300,
   position: 'absolute',
   top: 0,
   left: 0,
  },
  GLContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    // flex: 1
  },
  cameraContainer: {
    flex: 1,
    // display: 'flex',
    // justifyContent: 'center',
    // alignItems: 'center',
    // width: '10%',
    // height: '10%',
    // backgroundColor: '#fff',
  },
  camera : {
    flex: 1,
    // display: 'flex',
    // width: '92%',
    // height: '64%',
    // backgroundColor: '#f0F',
    // zIndex: 1,
    // borderWidth: 20,
    // borderRadius: 40,
    // borderColor: '#f0f',
  }
})

export default App;
