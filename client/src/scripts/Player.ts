// scenes
import { Game } from "../scenes/Game";

// components
import { Interactable } from "./Interactable";
import { LivingEntity } from "./LivingEntity";
import { Spells } from "./Spell";
import { Teleport } from "./Teleport";

export class Player extends LivingEntity {
	// typings
	keyArrows: Phaser.Types.Input.Keyboard.CursorKeys;
	keyWASD: {
		W: Phaser.Input.Keyboard.Key;
		A: Phaser.Input.Keyboard.Key;
		S: Phaser.Input.Keyboard.Key;
		D: Phaser.Input.Keyboard.Key;
	};
	keyF: Phaser.Input.Keyboard.Key;
	keyTAB: Phaser.Input.Keyboard.Key;

	// interaction
	lastContact!: undefined | Interactable | Teleport;

	// visuals
	depth: number = 10;

	// movement
	turnThreshold: number = 20;
	speedDampening: number = 2;

	// attacking
	fireCooldown: number = 0;
	spells: Spells;

	// inventory
	equipped!: { spell: string; armor: string };
	inventory!: { spells: string[]; armors: string[] };

	constructor(scene: Game, x: number, y: number) {
		// get player data
		let playerData = scene.cache.json.get("game").player;

		// pass values
		super(
			scene,
			x,
			y,
			playerData.texture,
			"Player",
			playerData.type,
			playerData.stats,
			playerData.details
		);

		// save values
		this.scene = scene;
		this.equipped = playerData.equipped;
		this.inventory = playerData.inventory;

		// movement keys
		this.keyArrows = (
			scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
		).createCursorKeys();
		this.keyWASD = {
			W: (
				scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
			).addKey(Phaser.Input.Keyboard.KeyCodes.W),
			A: (
				scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
			).addKey(Phaser.Input.Keyboard.KeyCodes.A),
			S: (
				scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
			).addKey(Phaser.Input.Keyboard.KeyCodes.S),
			D: (
				scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
			).addKey(Phaser.Input.Keyboard.KeyCodes.D),
		};

		// interact key
		this.keyF = (
			scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
		).addKey(Phaser.Input.Keyboard.KeyCodes.F);
		this.keyF.on("down", this.checkInteract, this);

		// inventory key
		this.keyTAB = (
			scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
		).addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
		this.keyTAB.on("down", this.toggleInventory, this);

		// default frame
		this.setFrame(2);

		// set depth (renders under/over other sprites)
		this.setDepth(this.depth);

		// initialize spells
		this.spells = new Spells(scene, this.equipped.spell);

		// events
		scene.events.on("update", this.update, this);
		this.once("destroy", this.onDestroy, this);
	}

	onDestroy() {
		// remove listeners
		this.scene.events.removeListener("update", this.update, this);
		this.keyF.removeListener("down", this.checkInteract, this);
		this.keyTAB.removeListener("down", this.toggleInventory, this);
	}

	update() {
		// handle attacking
		if (this.scene.time.now > 2000) this.handleAttack();

		// handle movement
		this.handleMovement();
	}

	// check if player is interacting
	checkInteract() {
		if (this.lastContact !== undefined) {
			this.lastContact.interact();
		}
	}

	// check if player is attacking
	handleAttack() {
		// shoot spells
		if (
			this.scene.input.activePointer.isDown &&
			this.scene.time.now > this.fireCooldown
		) {
			// reset cooldown
			this.fireCooldown =
				this.scene.time.now +
				Number(
					this.scene.cache.json.get("game").spells[
						this.equipped.spell
					].firerate
				);

			// update mouse world position
			this.scene.input.activePointer.updateWorldPoint(this.scene.camera);

			// fire spell from the current actual world player position to the current actual world mouse position
			this.spells.fire(
				this.x,
				this.y,
				this.scene.input.activePointer.worldX,
				this.scene.input.activePointer.worldY
			);
		}
	}

	// check if player is moving
	handleMovement() {
		// init direction
		let directionX: string = "";
		let directionY: string = "";

		// init velocity
		let velocity: number = this.stats.speed;

		// init vector
		let vector: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
		let rotatedVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

		// get camera
		let camera = this.scene.cameras.main;

		// if pointer down, make player face the pointer
		if (this.scene.input.activePointer.isDown) {
			// get pointer position relative to the camera view
			let pointer = this.scene.input.activePointer;

			// get relative position of player to camera
			let relativePos = this.getRelativePosition(camera);

			// get difference between player position and pointer position to determine where the pointer is relative to the player
			let difference = {
				x: relativePos.x - pointer.x,
				y: relativePos.y - pointer.y,
			};

			// player looking left
			if (difference.x > this.turnThreshold) {
				this.anims.play("left", true);
				directionX = "left";
			}
			// player looking right
			else if (difference.x < -this.turnThreshold) {
				this.anims.play("right", true);
				directionX = "right";
			}
			// player looking away from the player
			else if (difference.y > 0) {
				this.anims.play("back", true);
				directionY = "up";
			}
			// player looking towards the player
			else if (difference.y <= 0) {
				this.anims.play("front", true);
				directionY = "down";
			}
		}

		// get keyboard presses
		let key = {
			left: {
				isDown: this.keyArrows.left.isDown
					? this.keyArrows.left.isDown
					: this.keyWASD.A.isDown,
			},
			right: {
				isDown: this.keyArrows.right.isDown
					? this.keyArrows.right.isDown
					: this.keyWASD.D.isDown,
			},
			up: {
				isDown: this.keyArrows.up.isDown
					? this.keyArrows.up.isDown
					: this.keyWASD.W.isDown,
			},
			down: {
				isDown: this.keyArrows.down.isDown
					? this.keyArrows.down.isDown
					: this.keyWASD.S.isDown,
			},
		};

		// moving up
		if (key.up.isDown) {
			// determine direction
			if (directionY === "") directionY = "up";

			// determine velocity
			if (directionY !== "up")
				velocity = this.stats.speed / this.speedDampening;

			// move up
			vector.y = -velocity;

			// play moving up animation
			if (!this.scene.input.activePointer.isDown)
				this.anims.play("back", true);
		}

		// moving down
		else if (key.down.isDown) {
			// determine direction
			if (directionY === "") directionY = "down";

			// determine velocity
			if (directionY !== "down")
				velocity = this.stats.speed / this.speedDampening;

			// move down
			vector.y = velocity;

			// play moving down animation
			if (!this.scene.input.activePointer.isDown)
				this.anims.play("front", true);
		}

		// moving left
		if (key.left.isDown) {
			// determine direction
			if (directionX === "") directionX = "left";

			// determine velocity
			if (directionX !== "left")
				velocity = this.stats.speed / this.speedDampening;

			// move left
			vector.x = -velocity;

			// play moving left animation
			if (!this.scene.input.activePointer.isDown)
				this.anims.play("left", true);
		}

		// moving right
		else if (key.right.isDown) {
			// determine direction
			if (directionX === "") directionX = "right";

			// determine velocity
			if (directionX !== "right")
				velocity = this.stats.speed / this.speedDampening;

			// move right
			vector.x = velocity;

			// play moving right animation
			if (!this.scene.input.activePointer.isDown)
				this.anims.play("right", true);
		}

		// half speed if traveling diagonally
		if (vector.x && vector.y)
			[vector.x, vector.y] = [vector.x / 1.5, vector.y / 1.5];

		// rotate vector dependant on current camera rotation
		rotatedVector = this.scene.matter.vector.rotate(
			vector,
			-(camera as any).rotation
		) as Phaser.Math.Vector2;

		// move
		this.applyForce(rotatedVector);

		// not moving
		if (
			!key.left.isDown &&
			!key.right.isDown &&
			!key.up.isDown &&
			!key.down.isDown
		) {
			this.setVelocity(0, 0);
		}
	}

	toggleInventory() {
		// pause current scene
		this.scene.scene.pause();

		// launch inventory menu
		this.scene.scene.launch("Inventory", this.scene);
	}
}
