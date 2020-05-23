
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as posenet from '@tensorflow-models/posenet';
import React from 'react';
import * as RNFS from 'react-native-fs';
import * as jpeg from 'jpeg-js';
import * as FileSystem from 'expo-file-system'
import { GLView } from 'expo-gl';
import { setCanvasSize, contextCreate, renderPoints } from './src/gl.js';

import {
  StyleSheet,
  View,
  Image
} from 'react-native';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isTfReady: false,
      isPosenetLoaded: false,
      net: null,
      points: null
    };
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

      this.setState({points: points});
    }

    console.log("posenet done checking.");
  }

  render() {

    renderPoints(this.state.points);

    return (
      <View stype={styles.MainContainer}>
        <Image source={require("./asset/dog.jpg")}></Image>
        <GLView style={styles.GLContainer}
          onContextCreate={contextCreate}
        />
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
  }
})

export default App;
