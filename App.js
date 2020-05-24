
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as posenet from '@tensorflow-models/posenet';
import React from 'react';
import * as RNFS from 'react-native-fs';
import * as jpeg from 'jpeg-js';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import { GLView } from 'expo-gl';
import { Camera } from 'expo-camera';
import { setCanvasSize, contextCreate, renderPoints } from './src/gl.js';

import {
  StyleSheet,
  View,
  Image,
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
      points: null,
      hasCameraPermission: false,
      cameraType: Camera.Constants.Type.front,
    };

    this.camera = null;
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
      this.loadImage();
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
    rawImageData = new Uint8Array(imgBuffer);
   
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

  setCamera(camera) {
    this.camera = (camera);
  }

  render() {
    //const hasCameraPermission = this.state.hasCameraPermission;

    renderPoints(this.state.points);

    return (
      <View stype={styles.cameraContainer}>
        {/* <Image source={require("./asset/dog.jpg")}></Image> */}
        <Camera
          style={styles.camera}
          type={this.state.cameraType}
          ref={ref => { this.setCamera(ref) }}>
            <View style={{
                flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'row',
              }}>
              <TouchableOpacity
                style={{
                  flex: 0.1,
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setType(
                    type === Camera.Constants.Type.back
                      ? Camera.Constants.Type.front
                      : Camera.Constants.Type.back
                  );
                }}>
                <Text style={{ fontSize: 18, marginBottom: 10, color: 'white' }}> Flip </Text>
              </TouchableOpacity>
            </View>
        </Camera>
        {/* <GLView style={styles.GLContainer}
          onContextCreate={contextCreate}
        /> */}
      </View>
    );
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
    width: 300,
    height: 300,
    position: 'absolute',
    top: 0,
    left: 0,
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
