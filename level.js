import {Sprite, GameObject, Texture2D} from "./obj/Sprite.js"
import {level, menu, setPlayer, player} from "./state.js"
import {mat4, vec2, vec3, quat} from "./gl-matrix-min.js"

const X_SCALE = 1//0.25
const Y_SCALE = 1

const TYPE_ID_MAP = {
	background : 0,
	deco : 1,
	collidable : 2,
	xcollidable : 3,
	interactable : 4,
	foreground : 5
}

//move to util
function readJSON(file, callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType("application/json");
	rawFile.open("GET", file, false);
	rawFile.onreadystatechange = function() {
		if (rawFile.readyState === 4 && rawFile.status == "200") {
			callback(rawFile.responseText);
		}
		else if (rawFile.status != "200")
		{
			alert("failed to load JSON file " + file)
		}
	}
	rawFile.send(null);
}

export function loadLevel(id) {
	readJSON("levels/level" + id + ".json", initLevel.bind(null, id))
}

export function initLevel(id, rawData) {
	//freeze game state

	let levelData = JSON.parse(rawData)

	//verify ID
	if (levelData["id"] !== id)
		console.warning("Failed to verify level ID with internal ID. Some level designer must have fallen asleep.")

    // intro
    if (levelData["intro"]) {
        menu.sprite = new Sprite("assets/" + levelData["intro"]["spriteName"] + ".png", mat4.fromScaling(mat4.create(), vec3.fromValues(5, 5, 5)));
        menu.cooldown = levelData["intro"]["duration"];
    }

    level.id = id;

	//pedantic
	let objects = levelData["objects"].sort((a, b) => TYPE_ID_MAP[a["type"]] < TYPE_ID_MAP[b["type"]] ? -1 : 1)
	level["objects"] = []

	for (let entry of levelData["hiddenRooms"])
	{
		let transformation = mat4.create()
		let pos = vec3.fromValues(entry["pos"]["x"] * X_SCALE, entry["pos"]["y"] * Y_SCALE, 0)
		let scale = vec3.fromValues(entry["size"]["width"] * X_SCALE * 0.5, entry["size"]["height"] * Y_SCALE * 0.5, 0)
		mat4.fromRotationTranslationScale(transformation, quat.create(), pos, scale)
		level.objects.push(new Sprite("assets/" + entry["spriteName"] + ".png", transformation))
	}

	for (let entry of objects)
	{
		let pos1 = vec2.fromValues(entry["pos"]["x"] * X_SCALE, entry["pos"]["y"] * Y_SCALE)
		let size = vec2.fromValues(entry["size"]["width"] * X_SCALE, entry["size"]["height"] * Y_SCALE)
        let offset = vec2.fromValues(0, 0);
        let scale = vec2.fromValues(1, 1);
        if (entry["scale"]) {
            scale = vec2.fromValues(entry["scale"]["x"], entry["scale"]["y"]);
        }
        if (entry["offset"]) {
            offset = vec2.fromValues(entry["offset"]["x"], entry["offset"]["y"]);
        }
        let orientation = entry["orientation"];

		let obj = null;

		switch(entry["type"])
		{
		case "background":
		case "foreground":
		case "deco":
            let transformation = mat4.create()
			let pos = vec3.fromValues(entry["pos"]["x"] * X_SCALE, entry["pos"]["y"] * Y_SCALE, 0)
			scale = vec3.fromValues(entry["size"]["width"] * X_SCALE * 0.5, entry["size"]["height"] * Y_SCALE * 0.5, 0)
			mat4.fromRotationTranslationScale(transformation, quat.create(), pos, scale)
			level.objects.push(new Sprite("assets/" + entry["spriteName"] + ".png", transformation))
			break;
		case "collidable":
			level.objects.push(new GameObject("assets/" + entry["spriteName"] + ".png", pos1, size, "collidable", scale, offset, orientation))
			break;
		case "xcollidable":
			level.objects.push(new GameObject("assets/" + entry["spriteName"] + ".png", pos1, size, "xcollidable", scale, offset, orientation))
			break;
		case "interactable":
            obj = new GameObject("assets/" + entry["spriteName"] + ".png", pos1, size, "interactable", scale, offset, orientation);
            obj.pickup = entry["pickup"];
			level.objects.push(obj)
			break;
		}
        level.exit = vec2.fromValues(levelData["exit"]["x"], levelData["exit"]["y"]);
	}

	
	level.objects.push(new GameObject(null, vec2.fromValues(0, -5), vec2.fromValues(10000, 5), "collidable")); //the fuck

	let cntr = 0
	for (let entry of levelData["lights"]) 
	{
		let color = [0, 0, 0]
		let pos = [0, 0]
		let dir = [0, 0]
		let cutoff = 0
		let intensity = 0
		
		color[0] = entry["color"]["r"]
		color[1] = entry["color"]["g"]
		color[2] = entry["color"]["b"]
		
		pos[0] = entry["pos"]["x"]
		pos[1] = entry["pos"]["y"]
		
		//currently expected to be normalized
		dir[0] = entry["dir"]["x"]
		dir[1] = entry["dir"]["y"]
		
		cutoff = entry["cutoff"]
		intensity = entry["intensity"]
		
		level.updateLight(cntr, color, pos, dir, cutoff, intensity)
		cntr += 1;
		
	}
	
	for (let i = cntr; i < 20; i++)
	{
		level.updateLight(i, [0, 0, 0], [0, 0], [0, 0], 0, 0)
	}
	
	level.lightCnt = cntr;
	console.log(level.lights)
	
	level.isInitialized = false

    // TODO: Change this
    setPlayer(new GameObject("./assets/walk_circle_halved.png", vec2.fromValues(0, 0), vec2.fromValues(1, 2.5), "player", vec2.fromValues(3.5, 3.5 / 2.5), vec2.fromValues(0, 0.2)), 0);
    player.velocity = vec2.fromValues(0, 0);
    player.onGround = false;
    player.sprite.texture.frames = 5;
}
