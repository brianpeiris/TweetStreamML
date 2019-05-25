import * as glm from "gl-matrix";
import * as lumin from "lumin";
import { EntityManager } from "tiny-ecs";

import * as configDefaults from "./config.defaults";
import * as configOverrides from "./config";
const config = Object.assign({}, configDefaults, configOverrides);

export class App extends lumin.LandscapeApp {
  onAppStart() {
    const prism = this.requestNewPrism([0.5, 0.5, 0.5]);
    prism.setPrismController(new Controller(this.getWritablePath()));
  }
}

class Controller extends lumin.PrismController {
  constructor(baseFilePath) {
    super();
    this.baseFilePath = baseFilePath;
    this.systems = [];
  }
  onAttachPrism() {
    this.time = 0;
    const prism = this.getPrism();

    const ecs = new EntityManager();
    this.systems.push(new TweetSpawner(ecs, prism, this.baseFilePath, "magicleap"));
    this.systems.push(new FloatSystem(ecs));

    const bottomImage = lumin.ui.UiImage.Create(prism, "res/bottom.png", 0.5, 0.5);
    bottomImage.setColor([0.4, 0.5, 0.8, 1]);
    bottomImage.setAlignment(lumin.ui.Alignment.CENTER_CENTER);
    bottomImage.setLocalPosition([0, -0.24, 0]);
    bottomImage.setLocalRotation(glm.quat.fromEuler(bottomImage.getLocalRotation(), -90, 0, 0));
    prism.getRootNode().addChild(bottomImage);
  }
  onUpdate(delta) {
    this.time += delta;
    for (const system of this.systems) {
      system.update(this.time, delta);
    }
  }
  onEvent() {
    return true;
  }
}

class TweetSpawner {
  constructor(ecs, prism, baseFilePath, term) {
    this.ecs = ecs;
    this.prism = prism;
    this.baseFilePath = baseFilePath;
    this.term = term;
    this.tweetInterval = 5;
    this.lastTweet = 0;
    this.statuses = [];
    this.fetchingStatuses = false;
    this.fetchStatuses();
  }
  update(time) {
    if (time - this.lastTweet < this.tweetInterval) return;
    if (this.fetchingStatuses) return;
    if (this.statuses.length === 0) {
      this.fetchStatuses();
      return;
    }

    const status = this.statuses.pop();

    const entity = this.ecs.createEntity();
    entity.addComponent(Node);
    entity.addComponent(Speed);

    const { node, speed } = entity;

    speed.speed = 0.01 + Math.random() * 0.05;

    node.node = this.createTweetNode(status);

    this.lastTweet = time;
  }
  createTweetNode(status) {
    const prism = this.prism;
    const node = prism.createTransformNode(lumin.MAT4_IDENTITY);
    node.setLocalPosition([0.05 + (Math.random() * 0.15 - 0.075), -0.25, Math.random() * 0.4 - 0.2]);

    const imageNode = lumin.ui.UiImage.Create(prism, status.user.imagePath, 0.06, 0.06, true);
    imageNode.setAlignment(lumin.ui.Alignment.CENTER_LEFT);
    imageNode.setLocalPosition([-0.15 - 0.08, 0, 0.01]);

    const text = `${status.user.name} @${status.user.screen_name} (<3 ${status.favorite_count}):\n${status.text}`;
    let textNode = lumin.ui.UiText.Create(prism, text);
    textNode.setTextColor([0.1, 0.2, 0.3, 1]);
    textNode.setTextAlignment(lumin.ui.HorizontalTextAlignment.kLeft);
    textNode.setBoundsSize([0.3, 0.5]);
    textNode.setLocalPosition([-0.15, 0, 0]);
    textNode.setAlignment(lumin.ui.Alignment.CENTER_LEFT);

    const backImage = lumin.ui.UiImage.Create(prism, "res/back.png", 0.32, 0.1);
    backImage.setLocalPosition([-0.16, 0, -0.01]);
    backImage.setAlignment(lumin.ui.Alignment.CENTER_LEFT);
    backImage.setIsOpaque(false);

    node.addChild(backImage);
    node.addChild(textNode);
    node.addChild(imageNode);

    prism.getRootNode().addChild(node);
    return node;
  }
  async fetchStatuses() {
    this.fetchingStatuses = true;

    this.statuses = await fetch(
      `https://api.twitter.com/1.1/search/tweets.json?q=${this.term}&result_type=mixed&lang=en`,
      { headers: { authorization: `bearer ${config.TWITTER_BEARER}` } }
    )
      .then(r => r.json())
      .then(json => json.statuses)
      .catch(e => {
        this.fetchingStatuses = false;
        console.error(e);
        return [];
      });

    const imageDownloads = [];
    for (const status of this.statuses) {
      const imageName = status.user.profile_image_url_https.split("/").slice(-1)[0];
      const imagePath = `${this.baseFilePath}${imageName}`;
      status.user.imagePath = imagePath;
      imageDownloads.push(download(status.user.profile_image_url_https.replace("normal", "bigger"), imagePath));
    }
    await Promise.all(imageDownloads);

    this.fetchingStatuses = false;
  }
}

function Node() {
  this.node = null;
}

function Speed() {
  this.speed = 0;
}

class FloatSystem {
  constructor(ecs) {
    this.entities = ecs.queryComponents([Node, Speed]);
  }
  update(time, delta) {
    for (const { node, speed } of this.entities) {
      const pos = node.node.getLocalPosition();
      pos[1] += speed.speed * delta;
      node.node.setLocalPosition(pos);
    }
  }
}

async function download(url, file) {
  let res = await fetch(url);
  return fetch("file://" + file, { method: "PUT", body: res.body });
}
