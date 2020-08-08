<template>
  <div id="app">
    <div class="file-select-btn" @click="$refs.fileId.click()">
      选择音乐
      <input ref="fileId" type="file" class="file-input" @change="getAudio" />
    </div>
  </div>
</template>

<script>
// import * as THREE from './lib/three.module.js';
import * as THREE from "three";
import { OrbitControls } from "./lib/OrbitControls.js";
import { GUI } from "./lib/dat.gui.module.js";

import { EffectComposer } from "./lib/EffectComposer.js";
import { RenderPass } from "./lib/RenderPass.js";
import { UnrealBloomPass } from "./lib/UnrealBloomPass.js";
import { ShaderPass } from "./lib/ShaderPass.js";
import { CopyShader } from "./lib/CopyShader.js";
import Stats from "./lib/stats.module.js";
import { range } from "./components/range";
import { node } from "./components/node";
import { randomRange } from "./components/randomRange";
import { Triangle } from "./components/Triangle";

let renderer, scene, camera, controls, stats, composer;
let gui = {
  R: 20,
  G: 90,
  B: 225,
  TrianglesBgColor: 0x03a9f4,
  TrianglesLineColor: 0x03a9f4,
  lineColor: 0x00ffff,
  rotate: false
};
let audio, analyser; // 音频
let linesGroup,
  outLine,
  inLine,
  barLine = [],
  barNodes; // 线
let barGroup; // 柱子
let Triangles = [],
  TriangleGroup;

export default {
  name: "App",
  data() {
    return {
      positionZ: 80,
      N: 256,
      clock: new THREE.Clock(),
      scale: 1
    };
  },
  methods: {
    init() {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearAlpha(0);
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);
      scene = new THREE.Scene();
      // scene.background = new THREE.TextureLoader().load(require('@/assets/bg2.jpg'));

      {
        scene.background = new THREE.CubeTextureLoader().load([
          require('@/assets/skybox/right.jpg'),
          require('@/assets/skybox/left.jpg'),
          require('@/assets/skybox/top.jpg'),
          require('@/assets/skybox/bottom.jpg'),
          require('@/assets/skybox/front.jpg'),
          require('@/assets/skybox/back.jpg')
        ]);
      }
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        10000
      );
      camera.position.z = this.positionZ;
      window.addEventListener("resize", this.onWindowResize, false);

      this.audioLines(20, this.N);
      this.audioBars(25, this.N / 2); // 添加音频柱子

      TriangleGroup = new THREE.Group();

      setInterval(this.addTriangle.bind(this), 500);
      scene.add(TriangleGroup);

      // 加载音频 start
      let listener = new THREE.AudioListener(); // 监听者
      audio = new THREE.Audio(listener); // 非位置音频对象
      let audioUrl = require("../static/audio.mp3");
      this.audioLoad(audioUrl);
      // 加载音频 end

      this.initLight();
      this.initControls();

      this.initGui();
      this.initBloomPass();

      this.initStats();
      this.animate();
    },

    renderGeometries(vertices) {
      const res = [];
      vertices = vertices.concat(vertices[0]);
      vertices.forEach(value => {
        res.push(value.x, value.y, 0);
      });
      return new THREE.BufferAttribute(new Float32Array(res), 3);
    },
    updateCircle() {
      if (barNodes) {
        linesGroup.scale.set(this.scale, this.scale, this.scale);
        const geometryA = outLine.geometry;
        const AttributeA = geometryA.getAttribute("position");
        const geometryB = inLine.geometry;
        const AttributeB = geometryB.getAttribute("position");

        const positions = barNodes.map(value => {
          return [value.positionA(), value.positionB()];
        });
        positions.forEach((position, index) => {
          AttributeA.set([position[0].x, position[0].y], index * 3);
          AttributeB.set([position[1].x, position[1].y], index * 3);
          const geometry = barLine[index].geometry;
          const Attribute = geometry.getAttribute("position");
          Attribute.set(
            [position[0].x, position[0].y, 0, position[1].x, position[1].y, 0],
            0
          );
          Attribute.needsUpdate = true;
        });
        AttributeA.set(
          [AttributeA.array[0], AttributeA.array[1]],
          positions.length * 3
        );
        AttributeB.set(
          [AttributeB.array[0], AttributeB.array[1]],
          positions.length * 3
        );
        AttributeA.needsUpdate = true;
        AttributeB.needsUpdate = true;
      }
    },
    // 音频线
    audioLines(radius, countData) {
      barNodes = range(0, countData).map(index => {
        return new node(
          radius,
          ((index / countData) * 360 + 45) % 360,
          new THREE.Vector2(0, 0)
        );
      });
      const lineMaterial = new THREE.LineBasicMaterial({
        color: gui.lineColor
      });
      barLine = range(0, countData).map(index => {
        return new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            "position",
            this.renderGeometries([
              barNodes[index].positionA(),
              barNodes[index].positionB()
            ])
          ),
          lineMaterial
        );
      });
      outLine = new THREE.Line(
        new THREE.BufferGeometry().setAttribute(
          "position",
          this.renderGeometries(barNodes.map(node => node.positionA()))
        ),
        lineMaterial
      );

      inLine = new THREE.Line(
        new THREE.BufferGeometry().setAttribute(
          "position",
          this.renderGeometries(barNodes.map(node => node.positionB()))
        ),
        lineMaterial
      );

      linesGroup = new THREE.Group();
      linesGroup.add(outLine);
      linesGroup.add(inLine);
      barLine.forEach(line => linesGroup.add(line));
      scene.add(linesGroup);
    },
    addTriangle() {
      const material = new THREE.MeshBasicMaterial({
        color: gui.TrianglesBgColor
      });
      const lineMaterial = new THREE.LineBasicMaterial({
        color: gui.TrianglesLineColor
      });
      // const point = this.Triangles.length;
      const triangle = this.makeTriangle(material, lineMaterial, t => {
        Triangles = Triangles.filter(triangle => {
          return triangle !== t;
        });
        TriangleGroup.remove(t.group);
      });
      TriangleGroup.add(triangle.group);

      Triangles.push(triangle);
    },
    makeTriangle(material, lineMaterial, t) {
      const triangle = new Triangle(
        2,
        new THREE.Vector3(0, 0, 0),
        Math.random() * 360,
        randomRange(5, 1),
        randomRange(0.1, 0.05),
        material,
        lineMaterial,
        {
          startShow: 15,
          endShow: 30,
          startHide: 60,
          endHide: 70
        },
        t
      );
      return triangle;
    },
    // 音频柱子
    audioBars(radius, countData) {
      barGroup = new THREE.Group();
      let R = radius;
      let N = countData;
      for (let i = 0; i < N; i++) {
        let minGroup = new THREE.Group();
        let box = new THREE.BoxGeometry(1, 1, 1);
        let material = new THREE.MeshPhongMaterial({
          color: 0x00ffff
        }); // 材质对象
        let m = i;
        let mesh = new THREE.Mesh(box, material);

        mesh.position.y = 0.5;
        minGroup.add(mesh);
        minGroup.position.set(
          Math.sin(((m * Math.PI) / N) * 2) * R,
          Math.cos(((m * Math.PI) / N) * 2) * R,
          0
        );
        minGroup.rotation.z = ((-m * Math.PI) / N) * 2;
        barGroup.add(minGroup);
      }
      scene.add(barGroup);
    },
    // 辉光
    initBloomPass() {
      // 辉光
      let params = {
        exposure: 0.5,
        bloomStrength: 1,
        bloomThreshold: 0,
        bloomRadius: 0.8
      };
      let renderScene = new RenderPass(scene, camera);
      let bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.2,
        0
      );
      bloomPass.threshold = params.bloomThreshold;
      bloomPass.strength = params.bloomStrength;
      bloomPass.radius = params.bloomRadius;

      composer = new EffectComposer(renderer);
      // console.log(composer)
      const copyShader = new ShaderPass(CopyShader);
      copyShader.renderToScreen = true;
      composer.addPass(renderScene);
      composer.addPass(bloomPass);
      composer.addPass(copyShader);

      // 辉光 end
    },
    // 动态渲染
    animate() {
      stats.update();
      controls.update();

      if (analyser) {
        // 获得频率数据N个
        let arr = analyser.getFrequencyData();
        if (barGroup) {
          barGroup.rotation.z += 0.002;
          barGroup.scale.set(this.scale, this.scale, this.scale);
          barGroup.children.forEach((elem, index) => {
            if (gui.R) {
              elem.children[0].material.color.r = arr[index] / (gui.R * 3);
            }
            if (gui.G) {
              elem.children[0].material.color.g = arr[index] / (gui.G * 3);
            }
            if (gui.B) {
              elem.children[0].material.color.b = arr[index] / (gui.B * 3);
            }
            if (arr[index] === 0) {
              elem.scale.set(0, 0, 0);
            } else {
              let m = arr[index] / 20;
              let targetRange = Math.max(
                arr[index] / 20 - arr[index - 1] / 20,
                0
              );
              if (m < targetRange) {
                m = targetRange;
              }

              elem.scale.set(1, m, 1);
            }
          });
        }
        const Delta = this.clock.getDelta();
        barNodes.forEach((node, index, array) => {
          node.strength(arr[index % array.length] * 0.1);
          node.transition(Delta);
        });
        this.scale = 1 + arr[Math.ceil(arr.length * 0.05)] / 500;
        this.updateCircle(arr);
        Triangles.forEach(triangle => triangle.transition(Delta));
      }

      // renderer.render(scene, camera);
      composer.render();
      requestAnimationFrame(this.animate);
    },
    // 自适应屏幕
    onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    },
    // 鼠标控制
    initControls() {
      controls = new OrbitControls(camera, renderer.domElement);
      // 如果使用animate方法时，将此函数删除
      //controls.addEventListener( 'change', render );
      // 使动画循环使用时阻尼或自转 意思是否有惯性
      controls.enableDamping = true;
      //动态阻尼系数 就是鼠标拖拽旋转灵敏度
      //controls.dampingFactor = 0.25;
      //是否可以缩放
      controls.enableZoom = true;
      //是否自动旋转
      controls.autoRotate = gui.rotate;
      //设置相机距离原点的最远距离
      controls.minDistance = 1;
      //设置相机距离原点的最远距离
      controls.maxDistance = 200;
      //是否开启右键拖拽
      controls.enablePan = false;
    },
    // FPS显示
    initStats() {
      stats = new Stats();
      document.body.appendChild(stats.dom);
    },
    // GUI控制显示
    initGui() {
      //声明一个保存需求修改的相关数据的对象
      let datGui = new GUI();
      //将设置属性添加到gui当中，gui.add(对象，属性，最小值，最大值）
      datGui.add(gui, "R", 0, 255);
      datGui.add(gui, "G", 0, 255);
      datGui.add(gui, "B", 0, 255);
      datGui.add(gui, "rotate").onChange(function(val) {
        controls.autoRotate = val;
      });
      datGui.addColor(gui, "TrianglesBgColor").onChange(function() {
        TriangleGroup.traverse(function(child) {
          if (child.isMesh)
            child.material = new THREE.MeshPhongMaterial({
              color: gui.TrianglesBgColor
            });
        });
      });
      datGui.addColor(gui, "TrianglesLineColor").onChange(function() {
        TriangleGroup.traverse(function(child) {
          if (child.isLine)
            child.material = new THREE.LineBasicMaterial({
              color: gui.TrianglesLineColor
            });
        });
      });
      datGui.addColor(gui, "lineColor").onChange(function() {
        linesGroup.traverse(function(child) {
          if (child.isLine)
            child.material = new THREE.LineBasicMaterial({
              color: gui.lineColor
            });
        });
      });
    },
    // 环境光和平行光
    initLight() {
      scene.add(new THREE.AmbientLight(0x444444));
      let light = new THREE.PointLight(0xffffff);
      light.position.set(80, 100, 50);
      //告诉平行光需要开启阴影投射
      light.castShadow = true;
      scene.add(light);
    },
    //  音频加载播放
    audioLoad(url) {
      let _that = this;

      let audioLoader = new THREE.AudioLoader(); // 音频加载器
      audioLoader.load(url, function(AudioBuffer) {
        if (audio.isPlaying) {
          audio.stop();
          audio.setBuffer();
        }
        audio.setBuffer(AudioBuffer); // 音频缓冲区对象关联到音频对象audio
        audio.setLoop(true); //是否循环
        audio.setVolume(1); //音量
        audio.play(); //播放
        // 音频分析器和音频绑定，可以实时采集音频时域数据进行快速傅里叶变换
        analyser = new THREE.AudioAnalyser(audio, _that.N * 2);
      });
    },
    // 选择音频
    getAudio() {
      let _that = this;
      let objFile = this.$refs.fileId;
      if (objFile.value === "") {
        return false;
      }
      if (window.FileReader) {
        let reader = new FileReader();
        reader.readAsDataURL(objFile.files[0]);
        reader.onloadend = function(e) {
          _that.audioLoad(e.target.result);
        };
      }
    }
  },
  mounted() {
    this.init();
  }
};
</script>

<style lang="scss">
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

.file-select-btn {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 70px;
  height: 26px;

  box-shadow: 0 0 10px #c500e5 inset;
  line-height: 26px;
  color: #c500e5;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
}

.file-select-btn .file-input {
  display: none;
}
</style>
