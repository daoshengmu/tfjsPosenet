
var vertCode =
'attribute vec3 coordinates;' +

'void main(void) {' +
   ' gl_Position = vec4(coordinates, 1.0);' +
   'gl_PointSize = 10.0;'+
'}';

const fragCode = `
  void main(void) {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
  }`;

var _state = {
  initialized: false,
  gl: null,
  vertexbuffer: null,
  program: null,
}

export async function contextCreate(gl) {
  if (_state.initialized) {
    return;
  }

  _state.gl = gl;

  let vertexbuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);

  _state.vertexbuffer = vertexbuffer;

  let vertShader = gl.createShader(gl.VERTEX_SHADER);
  
  gl.shaderSource(vertShader, vertCode);

  gl.compileShader(vertShader);

  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(fragShader, fragCode);

  gl.compileShader(fragShader);
  
  var shaderProgram = gl.createProgram();

  gl.attachShader(shaderProgram, vertShader); 

  gl.attachShader(shaderProgram, fragShader);

  gl.linkProgram(shaderProgram);

  gl.useProgram(shaderProgram);

  _state.shaderProgram = shaderProgram;

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);

  var coord = gl.getAttribLocation(shaderProgram, "coordinates");

  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(coord);

  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  console.log("GL context initialized.");
  _state.initialized = true;
}

export async function clearWebGLBuffer() {
  let gl = _state.gl;
  if (!_state.initialized || !gl) {
    return;
  }

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.flush();
  gl.endFrameEXP();
}

export async function renderPoints(points) {
  let gl = _state.gl;

  if (!_state.initialized || !gl) {
    return;
  }

  console.log("viewport: " + gl.drawingBufferWidth + ", " + gl.drawingBufferHeight);

  // For debugging.
  let vertices = [
    -0.5, 0.5, 0.0,
    0.25, 0.5, 0.0,
    -0.0, -0.8, 0.0,
  ];

  if (points) {
    vertices = points;
  }
  console.log("points lens: " + vertices.length);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.useProgram(_state.shaderProgram);

  gl.bindBuffer(gl.ARRAY_BUFFER, _state.vertexbuffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  let coord = gl.getAttribLocation(_state.shaderProgram, "coordinates");

  // Point an attribute to the currently bound VBO
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);

  // Enable the attribute
  gl.enableVertexAttribArray(coord);

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.POINTS, 0, (vertices.length / 3));

  gl.flush();
  gl.endFrameEXP();
  console.log("Render points done.");
}
