
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as posenet from '@tensorflow-models/posenet';
import React from 'react';
import * as jpeg from 'jpeg-js';
import * as FileSystem from 'expo-file-system';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Permissions from 'expo-permissions';
import { GLView } from 'expo-gl';
import { Camera } from 'expo-camera';
import * as ImageManipulator from "expo-image-manipulator";
import * as ScreenOrientation from 'expo-screen-orientation';
import { contextCreate, renderPoints, clearWebGLBuffer } from './src/gl.js';

import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  TouchableOpacity
} from 'react-native';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTfReady: false,
      isPosenetLoaded: false,
      isActivated: false,
      net: null,
      cameraType: Camera.Constants.Type.front,
      hasCameraPermission: false
    };

    this.camera = null;
  }

  async componentDidMount() {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

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
    }

    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermission: status === 'granted'
    });
  }

  takePicture = async () => {
    const { hasCameraPermission } = this.state;
    if (hasCameraPermission && this.camera) {
      // `takePictureAsync()` will cause Android emulator crash.
      let photo = await this.camera.takePictureAsync();
      if (!photo) {
        return;
      }
      const resize = 0.05;
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: {width: photo.width * resize, height: photo.height * resize} }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const imgB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
      const rawImageData = new Uint8Array(imgBuffer);
     
      const TO_UINT8ARRAY = true;
      const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
      const image = {data: data, width: width, height: height};

      this.getPoseFromPhoto(image);
    }
  }

  // image is a object: {data: data, width: width, height: height}
  getPoseFromPhoto = async (image) => {
    let net = this.state.net;

    if (net) {
      const pose = await net.estimateSinglePose(image, {
        flipHorizontal: this.state.cameraType === Camera.Constants.Type.front
      });

      const imageW = image.width;
      const imageH = image.height;
      let keypoints = pose['keypoints'];
      let points = [];
      keypoints.forEach(key => {
       // console.log("" + key['part']+": " + key['position'].x + ", " +key['position'].y);
        let position = key['position'];
        points.push((position.x / imageW) * 2.0 - 1.0);
        points.push(((imageH - position.y) / imageH) * 2.0 - 1.0);
        points.push(0.0);
      });

      renderPoints(points);
      this.forceUpdate();
    }
  }

  clearGLScreen() {
    clearWebGLBuffer();
  }

  setActivate = async (activate) => {
   this.setState({isActivated: activate});
  }

  render() {
    const { hasCameraPermission, isActivated, isTfReady, isPosenetLoaded } = this.state;
    const goingToActivate = hasCameraPermission && isPosenetLoaded && isTfReady;

    if (hasCameraPermission === null) {
      return <View />;
    } else if (isActivated === false) {
      return (
        <View style={styles.mainContainer}>
          <Text style={styles.title}>React Native PoseNet</Text>
          <Text style={styles.title}>@daoshengmu</Text>
          <View style={{marginTop: 30}}>
            <View style={styles.loadingModelContainer}>
              <Text style={styles.text}>Camera ready?</Text>
              {hasCameraPermission ? (
                  <Text>🚀</Text>
                ) : (
                  <ActivityIndicator size='small'/>
                )}
            </View>
            <View style={styles.loadingModelContainer}>
              <Text style={styles.text}>TensorFlow ready?</Text>
              {isTfReady ? (
                  <Text>🚀</Text>
                ) : (
                  <ActivityIndicator size='small'/>
                )}
            </View>
            <View style={styles.loadingModelContainer}>
              <Text style={styles.text}>Posenet ready?</Text>
              {isPosenetLoaded ? (
                  <Text>🚀</Text>
                ) : (
                  <ActivityIndicator size='small'/>
                )}
            </View>
          </View>
            <TouchableOpacity style={styles.dashBox} onPress={goingToActivate ? this.setActivate : undefined}>
              {goingToActivate && (
                <Text style={styles.text}>Tap to start</Text>
              )}
            </TouchableOpacity>
        </View>
      );
    } else {
      return (
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
                  console.log("MaterialCommunityIcons pressed.");
                  const type = this.state.cameraType === Camera.Constants.Type.back
                    ? Camera.Constants. Type.front
                    : Camera.Constants.Type.back;
                  this.setState({cameraType: type});
                  this.clearGLScreen();
                }}>
                <MaterialCommunityIcons
                  name="camera-switch"
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
                  this.takePicture();
                }}>
                <FontAwesome
                    name="camera"
                    style={{ color: "#fff", fontSize: 40}}
                />
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  loadingModelContainer: {
    flexDirection: 'row',
    marginTop: 10
  },
  mainContainer: {
    marginTop: 30,
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center'
  },
  GLContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cameraContainer: {
    flex: 1,
  },
  camera : {
    flex: 1,
  },
  title: {
    color: '#000000',
    fontSize: 24,
    textAlign: 'center'
  },
  text: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center'
  },
  dashBox: {
    width: 280,
    height: 280,
    padding: 10,
    borderColor: '#7866bf',
    borderWidth: 5,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginTop: 40,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
})

export default App;
