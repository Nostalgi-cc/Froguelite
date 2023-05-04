// scenes
import { Game } from "../scenes/Game";

// components
import { LivingEntity } from "./LivingEntity";

export class Enemy extends LivingEntity {
	id: string;

	constructor(scene: Game, x: number, y: number, id: string) {
		// get enemy data
		let enemyData = scene.cache.json.get("game").enemies;

		// pass values
		super(
			scene,
			x,
			y,
			enemyData[id].texture,
			"Enemy",
			enemyData[id].type,
			enemyData[id].stats,
			enemyData[id].details
		);

		// save values
		this.textureKey = enemyData[id].texture;
		this.id = id;

		// set name
		this.setName(this.scene.cache.json.get("lang.en_us").enemy[id]);

		// set scale
		this.setScale(enemyData[id].scale);
	}
}
