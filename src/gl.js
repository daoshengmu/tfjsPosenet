import { GLView } from 'expo';
import { State } from 'react-native-gesture-handler';

var vertCode =
'attribute vec3 coordinates;' +

'void main(void) {' +
   ' gl_Position = vec4(coordinates, 1.0);' +
   'gl_PointSize = 10.0;'+
'}';

// fragment shader source code
const fragCode = `
  void main(void) {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
  }`;

var _state = {
  initialized: false,
  gl: null,
  width: 300,
  height: 300,
  vertexbuffer: null,
  program: null,
}

export function setCanvasSize(width, height) {
  _state.width = width;
  _state.height = height;
}

export async function contextCreate(gl) {
  if (_state.initialized) {
    return;
  }

  _state.gl = gl;

  // Create an empty buffer object to store the vertex buffer
  var vertexbuffer = gl.createBuffer();

  //Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);

  _state.vertexbuffer = vertexbuffer;

  // Unbind the buffer
  // gl.bindBuffer(gl.ARRAY_BUFFER, null);

  /*=========================Shaders========================*/

  // Create a vertex shader object
  var vertShader = gl.createShader(gl.VERTEX_SHADER);
  
  // Attach vertex shader source code
  gl.shaderSource(vertShader, vertCode);

  // Compile the vertex shader
  gl.compileShader(vertShader);

  // Create fragment shader object
  var fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  // Attach fragment shader source code
  gl.shaderSource(fragShader, fragCode);

  // Compile the fragmentt shader
  gl.compileShader(fragShader);
  
  // Create a shader program object to store
  // the combined shader program
  var shaderProgram = gl.createProgram();

  // Attach a vertex shader
  gl.attachShader(shaderProgram, vertShader); 

  // Attach a fragment shader
  gl.attachShader(shaderProgram, fragShader);

  // Link both programs
  gl.linkProgram(shaderProgram);

  // Use the combined shader program object
  gl.useProgram(shaderProgram);

  _state.shaderProgram = shaderProgram;

  /*======== Associating shaders to buffer objects ========*/

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);

//  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  // Get the attribute location
  var coord = gl.getAttribLocation(shaderProgram, "coordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coord);

  console.log("initialized.");
  _state.initialized = true;
}

export async function renderPoints(points) {
  if (!_state.initialized) {
    return;
  }

  // return;

  let gl = _state.gl;

  console.log("renderPoints." + gl.drawingBufferWidth + ", " + gl.drawingBufferHeight);

  // // Clear the canvas
  // gl.clearColor(0.5, 0.5, 0.5, 0.9);

  // // Enable the depth test
  // gl.enable(gl.DEPTH_TEST);

  // // Clear the color buffer bit
  // gl.clear(gl.COLOR_BUFFER_BIT);

  // // Set the view port
  // gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // // Bind vertex buffer object
  // gl.bindBuffer(gl.ARRAY_BUFFER, _state.vertexbuffer);

  var vertices = [
    -0.5, 0.5, 0.0,
    0.25, 0.5, 0.0,
    -0.0, -0.8, 0.0,
  ];

  if (points) {
    vertices = points;
  }
  console.log("points lens: " + vertices.length);

  // Use the combined shader program object
  gl.useProgram(_state.shaderProgram);

  /*======== Associating shaders to buffer objects ========*/

  // Bind vertex buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, _state.vertexbuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  // Get the attribute location
  var coord = gl.getAttribLocation(_state.shaderProgram, "coordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coord);

  /*============= Drawing the primitive ===============*/

  // Clear the canvas
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  // Enable the depth test
  gl.enable(gl.DEPTH_TEST);

  // Clear the color buffer bit
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Set the view port
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // Draw the triangle
  gl.drawArrays(gl.POINTS, 0, (vertices.length / 3));

  //gl.flush(); // need?
  gl.endFrameEXP();
}
