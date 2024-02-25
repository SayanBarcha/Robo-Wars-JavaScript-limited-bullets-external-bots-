const arenaSVG = document.getElementById("arena");

let frameInterval = 100; // Update frame every 100ms
let bulletColor = "#FF69B4";
let shieldColor = "#0FF";
const gameBG = `<filter id="blur">
		<feGaussianBlur stdDeviation="1" />
	</filter>
	<pattern id="rubber" width="20" height="15" patternUnits="userSpaceOnUse" patternTransform="scale(.1 .1)">
		<g filter="url(#blur)" fill="#000">
			<circle cx="9.8" cy="7.3" r="4" />
			<circle cx="19.8" cy="14.8" r="4" />
			<circle cx="-0.2" cy="14.8" r="4" />
			<circle cx="-0.2" cy="-0.2" r="4" />
			<circle cx="19.8" cy="-0.2" r="4" />
		</g>
		<g filter="url(#blur)" fill="#666">
			<circle cx="10.2" cy="7.7" r="4" />
			<circle cx="20.2" cy="15.2" r="4" />
			<circle cx="0.2" cy="15.2" r="4" />
			<circle cx="0.2" cy=".2" r="4" />
			<circle cx="20.2" cy=".2" r="4" />
		</g>
		<g fill="#111">
			<circle cx="20" cy="15" r="4" />
			<circle cx="0" cy="15" r="4" />
			<circle cx="0" cy="0" r="4" />
			<circle cx="10" cy="7.5" r="4" />
			<circle cx="20" cy="0" r="4" />
		</g>
	</pattern>
	<rect width="100%" height="100%" fill="#222" />
	<rect width="100%" height="100%" fill="url(#rubber)" />`;

let isGameRunning = false;

function changeFrameInterval(val) {
	frameInterval = val;
	document.querySelector(".gameSpeedMs").innerText = val;
}

class Arena {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.bots = [];
		this.projectiles = [];
	}

	// Method to get the bots in the arena
	getBots() {
		return this.bots;
	}
}

// Initialize the game
let arena = new Arena(100, 100);

// Projectile linked list implementation
class ProjectileNode {
	constructor(projectile) {
		this.projectile = projectile;
		this.next = null;
	}
}

class ProjectileLinkedList {
	constructor() {
		this.head = null;
		this.tail = null;
		this.length = 0;
	}

	// Add a new projectile to the end of the linked list
	add(projectile) {
		const newNode = new ProjectileNode(projectile);

		if (!this.head) {
			this.head = newNode;
			this.tail = newNode;
		} else {
			this.tail.next = newNode;
			this.tail = newNode;
		}

		this.length++;
	}

	// Remove a projectile from the linked list
	remove(projectile) {
		let currentNode = this.head;
		let prevNode = null;

		while (currentNode) {
			if (currentNode.projectile === projectile) {
				if (currentNode === this.head) {
					this.head = currentNode.next;
				} else if (currentNode === this.tail) {
					this.tail = prevNode;
					prevNode.next = null;
				} else {
					prevNode.next = currentNode.next;
				}

				this.length--;
				break;
			}

			prevNode = currentNode;
			currentNode = currentNode.next;
		}
	}

	// Method to remove all projectiles from the linked list
	removeAll() {
		this.head = null;
		this.tail = null;
		this.length = 0;
	}

	// Get the size of the linked list
	size() {
		return this.length;
	}

	// Iterate through the linked list and call a callback function on each node
	forEach(callback) {
		let currentNode = this.head;

		while (currentNode) {
			callback(currentNode.projectile);
			currentNode = currentNode.next;
		}
	}
}

// Bot class not editable by the Brain Makers
class Bot {
	constructor(x, y, brain) {
		// eachg bot needs a unique ID
		const getUUID = () => {
			let d = new Date().getTime();
			let uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
				/[xy]/g,
				function (c) {
					let r = (d + Math.random() * 16) % 16 | 0;
					d = Math.floor(d / 16);
					return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
				}
			);
			return uuid;
		};
		this.id = getUUID();
		this.x = x;
		this.y = y;
		this.r = 2;
		this.brain = brain;

		// Add a property to track the decision counter
		this.decisionCounter = 0;

		// Initial bullet count
		this.bulletCount = 10;

		// check em before we assign
		this.checkPowerValues();

		// Initial armor value (if 0, armor = 100)
		this.armor = (this.brain.armor || 0) * 25 + 100;
		// Initial bullet power
		this.bulletPower = this.brain.bulletPower || 0;
		// Initial scan radius
		this.scanRadius = (this.brain.scanDistance || 0) * 20;

		// create svg elements
		this.botElement = this.createBotElement();
		this.shieldElement = this.createShieldElement();
		this.scanElement = this.createScanElement();
		this.bandolierElement = this.createBandolierElement();
		this.projectilesList = new ProjectileLinkedList();

		// Create a closure to encapsulate the scan function
		const scan = () => {
			const enemyPositions = arena.bots
				.filter((bot) => bot !== this && this.isInScanRange(bot.x, bot.y))
				.map((bot) => ({ x: bot.x, y: bot.y }));
			if (enemyPositions.length > 0) {
				logMe(
					`${this.brain.name} scanned and found ${JSON.stringify(enemyPositions[0])}`
				);
			}

			return enemyPositions;
		};

		// Expose only the scan function to the Brain
		this.brain.scan = scan;

		// Create a getter function for whereAmI
		const whereAmI = () => {
			return { x: this.x, y: this.y };
		};

		// Add the whereAmI function to the existing brain object
		this.brain.whereAmI = whereAmI;
	}

	// this will punish you if you tried to give your bot too many points
	checkPowerValues() {
		function hasPower(power) {
			if (!power) {
				return 0;
			}
			return power;
		}
		function inBounds(power) {
			if (power >= 6 || power <= -1) {
				return false;
			}
			return true;
		}
		if (
			hasPower(this.brain.armor) +
				hasPower(this.brain.bulletPower) +
				hasPower(this.brain.scanDistance) >=
				6 ||
			!inBounds()
		) {
			this.brain.armor = 0;
			this.brain.bulletPower = 0;
			this.brain.scanDistance = 0;
		}
	}

	// create the circle that represents the bot
	createBotElement() {
		const botElement = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle"
		);
		botElement.classList.add("bot");
		botElement.setAttribute("r", this.r);
		botElement.setAttribute("cx", this.x);
		botElement.setAttribute("cy", this.y);
		botElement.setAttribute("fill", this.brain.color); // Set the color of the bot circle
		botElement.setAttribute("data-name", this.brain.name);
		arenaSVG.appendChild(botElement);
		return botElement;
	}

	// create the other circle that represents the shield element
	createShieldElement() {
		const shieldElement = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle"
		);
		let circumference = 2 * Math.PI * (this.r + 1.7);
		shieldElement.classList.add("shield");
		shieldElement.setAttribute("r", this.r + 1.7);
		shieldElement.setAttribute("cx", this.x);
		shieldElement.setAttribute("cy", this.y);
		shieldElement.setAttribute("fill", "none");
		shieldElement.setAttribute("stroke", shieldColor);
		shieldElement.setAttribute("opacity", "0.7");
		shieldElement.setAttribute("stroke-width", `1.5`);
		shieldElement.setAttribute("stroke-dashoffset", -circumference / 4);
		shieldElement.setAttribute("stroke-linecap", `round`);
		shieldElement.setAttribute(
			"stroke-dasharray",
			`0 ${circumference / (this.armor / 25)}`
		);
		// botElement.setAttribute("data-name", this.brain.name);
		arenaSVG.appendChild(shieldElement);
		return shieldElement;
	}
	// create the other circle that represents the bandolier element
	createBandolierElement() {
		const bandElement = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle"
		);
		let circumference = 2 * Math.PI * (this.r + 0.5);
		bandElement.classList.add("bandolier");
		bandElement.setAttribute("r", this.r + 0.5);
		bandElement.setAttribute("cx", this.x);
		bandElement.setAttribute("cy", this.y);
		bandElement.setAttribute("fill", "none");
		bandElement.setAttribute("stroke", bulletColor);
		bandElement.setAttribute("opacity", "0.8");
		bandElement.setAttribute("stroke-width", `1.1`);
		bandElement.setAttribute("stroke-dashoffset", circumference / 4);
		bandElement.setAttribute("stroke-linecap", `round`);
		bandElement.setAttribute(
			"stroke-dasharray",
			`0 ${circumference / this.bulletCount}`
		);
		// botElement.setAttribute("data-name", this.brain.name);
		arenaSVG.appendChild(bandElement);
		return bandElement;
	}

	// create the other circle that represents the shield element
	createScanElement() {
		const scanElement = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle"
		);
		let circumference = 2 * Math.PI * (this.brain.scanDistance * 20);
		scanElement.classList.add("scan");
		scanElement.setAttribute("r", this.brain.scanDistance * 20);
		scanElement.setAttribute("cx", this.x);
		scanElement.setAttribute("cy", this.y);
		scanElement.setAttribute("fill", "none"); // Set the color of the bot circle
		scanElement.setAttribute("stroke", "rgba(0,255,255,0.3)"); // Set the color of the bot circle
		scanElement.setAttribute("stroke-width", `0.1`);
		// botElement.setAttribute("data-name", this.brain.name);
		arenaSVG.appendChild(scanElement);
		return scanElement;
	}

	// Function to check if a given point (x, y) falls within the scan radius of the bot
	isInScanRange(x, y) {
		const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
		return distance <= this.scanRadius;
	}

	move() {
		// Increment the decision counter
		this.decisionCounter++;

		// Implement decide() method in the Brain class
		const action = this.brain.decide();

		// Check if the bot can fire based on the decision counter and remaining bullets
		if (this.decisionCounter % 5 == 0 && this.bulletCount <= 10) {
			this.bulletCount++;
		}

		if (action == "shoot" && this.bulletCount <= 0) {
			return;
		}

		// Update the bot's position based on the action (e.g., action = 'left', move left)
		switch (action) {
			case "left":
				this.x -= 1;
				break;
			case "right":
				this.x += 1;
				break;
			case "up":
				this.y -= 1;
				break;
			case "down":
				this.y += 1;
				break;
			case "shoot":
				this.shoot(this.brain.shotAngle);
				this.bulletCount--;
				break;
			// Add more cases for other actions as needed
		}

		// Ensure the bot stays within the viewBox boundaries
		this.x = Math.max(0, Math.min(this.x, 100 - this.r));
		this.y = Math.max(0, Math.min(this.y, 100 - this.r));

		// Update the position of the bot circle in the SVG
		this.botElement.setAttribute("cx", this.x);
		this.botElement.setAttribute("cy", this.y);
		this.shieldElement.setAttribute("cx", this.x);
		this.shieldElement.setAttribute("cy", this.y);
		this.bandolierElement.setAttribute("cx", this.x);
		this.bandolierElement.setAttribute("cy", this.y);
		this.scanElement.setAttribute("cx", this.x);
		this.scanElement.setAttribute("cy", this.y);
	}

	// Function to handle taking damage
	gotHit(damage) {
		this.armor -= damage;
		logMe(`${this.brain.name} is at ${this.armor} health!`);
		if (this.armor <= 0) {
			// Bot destroyed, handle accordingly (e.g., remove from SVG)
			this.destroy();
		} else {
			// Change the bot's color when it gets hit
			this.botElement.setAttribute("fill", "yellow");
			this.botElement.setAttribute("stroke", "rgba(255,0,0,0.8)");
			this.botElement.setAttribute("stroke-width", 0.5);
			this.shieldElement.setAttribute(
				"stroke-dasharray",
				`0 ${(2 * Math.PI * (this.r + 1.7)) / (this.armor / 25)}`
			);
			// Reset the bot's color after a delay
			setTimeout(() => {
				this.botElement.setAttribute("fill", this.brain.color);
				this.botElement.setAttribute("stroke-width", 0);
			}, 200);
		}
	}

	// random integer generator
	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	//Create a random number of circles
	explosion(
		circles = this.randInt(5, 9),
		x = this.x,
		y = this.y,
		minR = 7,
		maxR = 12,
		minDur = 600,
		maxDur = 2000
	) {
		for (let i = 0; i < circles; i++) {
			// create explosion
			const boomElement = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"circle"
			);
			// animate r
			const boomElementAnimation = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"animate"
			);
			// animate opacity
			const boomElementAnimation2 = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"animate"
			);
			let dur = `${this.randInt(minDur, maxDur)}ms`;
			boomElement.setAttribute("r", 2);
			boomElement.setAttribute("cx", x + this.randInt(-10, 10) / 100);
			boomElement.setAttribute("cy", y + this.randInt(-10, 10) / -100);
			boomElement.setAttribute(
				"fill",
				`rgba(${this.randInt(155, 255)},${this.randInt(100, 155)},0,0.9)`
			);
			boomElementAnimation.setAttribute("attributeName", "r");
			boomElementAnimation.setAttribute(
				"values",
				`0; ${this.randInt(minR, maxR)}`
			);
			boomElementAnimation.setAttribute("dur", dur);
			boomElementAnimation.setAttribute("fill", "freeze");
			boomElementAnimation.setAttribute("begin", "indefinite");
			boomElementAnimation.setAttribute("repeatCount", "none");
			boomElementAnimation.setAttribute("keyTimes", "0;1");
			boomElementAnimation.setAttribute("keySplines", "0.70 0.10 0.05 0.85");
			boomElementAnimation.setAttribute("calcMode", "spline");
			boomElement.appendChild(boomElementAnimation);
			boomElementAnimation2.setAttribute("attributeName", "opacity");
			boomElementAnimation2.setAttribute("values", "0.5; 1; 0");
			boomElementAnimation2.setAttribute("dur", dur);
			boomElementAnimation2.setAttribute("fill", "freeze");
			boomElementAnimation2.setAttribute("begin", "indefinite");
			boomElementAnimation2.setAttribute("repeatCount", "none");
			boomElement.appendChild(boomElementAnimation2);
			// add it to the arena
			arenaSVG.appendChild(boomElement);
			// start animations
			boomElementAnimation.beginElement();
			boomElementAnimation2.beginElement();
			setTimeout(() => {
				boomElement.remove();
			}, maxDur);
		}
	}
	// Destroy this bot
	destroy() {
		// don't destroy both bots
		if (isGameRunning) {
			logMe(`${this.brain.name} destroyed!`);

			// Remove the bot, shield, and scan elements from the DOM
			if (this.botElement.parentNode) {
				this.botElement.parentNode.removeChild(this.botElement);
				this.shieldElement.parentNode.removeChild(this.shieldElement);
				this.bandolierElement.parentNode.removeChild(this.bandolierElement);
				this.scanElement.parentNode.removeChild(this.scanElement);
				this.projectilesList.removeAll();
			}

			// go boom
			this.explosion(this.randInt(4, 10));

			// Update the `arena.bots` array to remove the destroyed bot
			const index = arena.bots.indexOf(this);
			if (index !== -1) {
				arena.bots.splice(index, 1);
			}

			// Check if there's only one bot left (the winner)
			if (arena.bots.length === 1) {
				isGameRunning = false;
				// Display the name of the surviving bot as the winner
				const survivingBotName = arena.bots[0].brain.name;
				logMe(`Winner: ${survivingBotName}!`);
				arena.bots[0].projectilesList.removeAll();
				const winnerText = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"text"
				);
				winnerText.setAttribute("font-family", `'Roboto', sans-serif`);
				winnerText.setAttribute("x", 50);
				winnerText.setAttribute("y", 38);
				winnerText.setAttribute("text-anchor", `middle`);
				winnerText.setAttribute("dominant-baseline", `middle`);
				winnerText.setAttribute("font-size", `8`);
				winnerText.setAttribute("font-weight", `900`);
				winnerText.setAttribute("fill", `goldenrod`);
				winnerText.textContent = `Winner:`;
				const winnerText2 = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"text"
				);
				winnerText2.setAttribute("font-family", `'Roboto', sans-serif`);
				winnerText2.setAttribute("x", 50);
				winnerText2.setAttribute("y", 50);
				winnerText2.setAttribute("text-anchor", `middle`);
				winnerText2.setAttribute("dominant-baseline", `middle`);
				winnerText2.setAttribute("font-size", `15`);
				winnerText2.setAttribute("font-weight", `900`);
				winnerText2.setAttribute("fill", `gold`);
				winnerText2.textContent = `${survivingBotName}`;
				arenaSVG.appendChild(winnerText);
				arenaSVG.appendChild(winnerText2);
			}
		}
	}

	// check if 2 objects are intersecting
	isIntersecting(obj1, obj2) {
		let sideA = Math.abs(obj1.y - obj2.y);
		let sideB = Math.abs(obj1.x - obj2.x);
		let distance = Math.sqrt(Math.pow(sideA, 2) + Math.pow(sideB, 2));

		return distance <= obj1.r + obj2.r;
	}

	// Function to shoot a projectile
	shoot(degree) {
		const projectileRadius = 1 + this.bulletPower / 10;
		// the speed is constant
		const projectileSpeed = 50 / (frameInterval * (this.bulletPower / 2 + 1));
		// the damage is 25 times whatever power level the brain gives it
		const damage = 25 * (this.bulletPower + 1);
		// the distance it travels gets divided by the bullet power given
		const maxTravelDistance = 141 / (this.bulletPower + 1);
		// Convert the degree value to radians
		const radians = (degree * Math.PI) / 180;

		// Calculate the normalized direction vector
		const dx = Math.cos(radians);
		const dy = Math.sin(radians);

		// Calculate the initial position of the projectile based on the bot's position
		let projectileX = this.x + dx * (this.r + projectileRadius);
		let projectileY = this.y + dy * (this.r + projectileRadius);

		// animate bullets left
		this.bandolierElement.setAttribute(
			"stroke-dasharray",
			`0 ${(2 * Math.PI * (this.r + 0.5)) / this.bulletCount}`
		);

		// Create the projectile circle element in the SVG
		const projectile = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle"
		);
		projectile.setAttribute("class", "projectile");
		projectile.setAttribute("cx", projectileX);
		projectile.setAttribute("cy", projectileY);
		projectile.setAttribute("r", projectileRadius);
		projectile.setAttribute("fill", bulletColor); // Set the color of the projectile

		// Create a new projectile and store it in the arena's projectiles array
		const projectileFired = {
			x: projectileX,
			y: projectileY,
			initX: projectileX,
			initY: projectileY,
			r: projectileRadius,
			damage: damage,
			id: this.id, // Store the bot that fired this projectile
			botName: this.brain.name, // Store the bot that fired this projectile
			projectileElement: projectile
		};

		// Add the projectile to the linked list
		this.projectilesList.add(projectileFired);

		// Add the projectile to the SVG
		arenaSVG.appendChild(projectile);

		// determine if the projectile is still moving
		let stillMoving = true;

		// Function to move the projectile in each frame
		function moveProjectile(timestamp) {
			// Update the position of the projectile in the direction for the set distance
			projectileX += dx * projectileSpeed;
			projectileY += dy * projectileSpeed;

			// Update the position of the projectile in the SVG
			projectile.setAttribute("cx", projectileX);
			projectile.setAttribute("cy", projectileY);

			// Update the position of the projectile in the stored projectile
			projectileFired.x = projectileX;
			projectileFired.y = projectileY;
			// reset the projectile to the one with updated x and y positions
			projectileFired.projectileElement = projectile;

			// Check if the projectile traveled max distance
			const distanceTraveled = Math.sqrt(
				Math.pow(projectileX - projectileFired.initX, 2) +
					Math.pow(projectileY - projectileFired.initY, 2)
			);

			if (
				// Check if the projectile traveled max distance
				distanceTraveled >= maxTravelDistance ||
				// Check if the projectile reached the edge of the arena
				projectileX <= -3 ||
				projectileX >= 103 ||
				projectileY <= -3 ||
				projectileY >= 103
			) {
				// Remove the projectile from the SVG

				projectile.setAttribute("cx", 150);
				projectile.setAttribute("cy", 150);
				projectile.setAttribute("r", 0);
				projectile.remove();
				projectileFired.r = 0;
				projectileFired.x = 150;
				projectileFired.y = 150;
				stillMoving = false;
				return;
			}

			// Check for collisions between projectiles of different bots
			if (stillMoving) {
				for (const bot of arena.bots) {
					if (bot.id !== projectileFired.id) {
						bot.projectilesList.forEach((enemyProjectile) => {
							const distanceToEnemyProjectile = Math.sqrt(
								Math.pow(projectileX - enemyProjectile.x, 2) +
									Math.pow(projectileY - enemyProjectile.y, 2)
							);

							if (distanceToEnemyProjectile <= projectileRadius + enemyProjectile.r) {
								// Collision detected between projectiles
								// Remove both projectiles from the SVG and their linked lists
								enemyProjectile.projectileElement.remove();
								bot.projectilesList.remove(enemyProjectile);
								projectile.setAttribute("cx", 150);
								projectile.setAttribute("cy", 150);
								projectile.setAttribute("r", 0);
								projectile.remove();
								// Optionally, you can create an explosion effect at the collision point
								// For example:
								const explosionX = (projectileX + enemyProjectile.x) / 2;
								const explosionY = (projectileY + enemyProjectile.y) / 2;
								bot.explosion(1, projectileX, projectileY, 1, 2, 200, 500);
								stillMoving = false;
								return;
							}
						});
					}
					// Check for collisions between projectiles and different bots
					if (bot.id !== projectileFired.id) {
						const botX = bot.x;
						const botY = bot.y;
						const distanceToBot = Math.sqrt(
							Math.pow(projectileX - botX, 2) + Math.pow(projectileY - botY, 2)
						);

						if (distanceToBot <= projectileRadius + bot.r) {
							// Collision detected
							projectileFired.projectileElement.remove();
							bot.projectilesList.remove(projectileFired);
							bot.gotHit(projectileFired.damage);
							logMe(`Direct hit on ${bot.brain.name}!`);
							return;
						}
					}
				}
			}

			let lastTimestamp = 0;

			if (!lastTimestamp) lastTimestamp = timestamp;
			const elapsedTime = timestamp - lastTimestamp;

			// Check if enough time has elapsed to update the game
			if (elapsedTime >= frameInterval && stillMoving) {
				moveProjectile(timestamp);
				lastTimestamp = timestamp - (elapsedTime % frameInterval);
			}

			requestAnimationFrame(moveProjectile);
		}

		requestAnimationFrame(moveProjectile);
	}
}

class Chaos {
	constructor() {
		this.name = "Chaos";
		this.color = "orange";
		this.armor = 5;
		this.scanDistance = 0;
		this.bulletPower = 0;
		this.shotAngle = 0;
	}

	// random integer generator
	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// custom function to randomize the shots
	randomizeShots() {
		this.shotAngle = this.randInt(0, 360);
	}

	decide() {
		const possibleMoves = ["left", "right", "up", "down", "shoot"];
		let mvmt = possibleMoves[this.randInt(0, 4)];
		this.randomizeShots();
		return mvmt;
	}
}

class CircleShot {
	constructor() {
		this.name = "Circle";
		this.color = "steelblue";
		this.armor = 2;
		this.scanDistance = 0;
		this.bulletPower = 3;

		this.shotAngle = 0;
		this.initialAngle = 0;
	}

	// random integer generator
	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// custom function to randomize the shots
	randomizeShots() {
		this.initialAngle += 12;
		if (this.initialAngle >= 360) {
			this.initialAngle = 0;
		}
		this.shotAngle = this.initialAngle;
	}
	decide() {
		let mvmt = "shoot";
		this.randomizeShots();
		return mvmt;
	}
}

// Implement the Brain class to control the bot's actions
class Sniper {
	constructor() {
		this.name = "Sniper";
		this.color = "lightgreen";
		this.armor = 1;
		this.scanDistance = 4;
		this.bulletPower = 0;

		this.decision = "shoot";
		this.shotAngle = 0;
		this.initialAngle = 0;
		this.movesLeft = 0;
		this.movesUp = 0;
		this.movesDown = 0;
	}

	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	calculateAngle(x1, y1, x2, y2) {
		// Calculate the differences in x and y coordinates
		const dx = x2 - x1;
		const dy = y2 - y1;

		// Convert the angle from radians to degrees
		let angleDegrees = (Math.atan2(dy, dx) * 180) / Math.PI;
		angleDegrees = angleDegrees % 360; // Convert negative angles to positive (0 to 360 degrees)

		return angleDegrees;
	}

	// shoot accurately yo
	takeTheShot() {
		let enemyPosition = this.scan();
		let myPosition = this.whereAmI();

		if (enemyPosition.length > 0) {
			this.shotAngle = this.calculateAngle(
				myPosition.x,
				myPosition.y,
				enemyPosition[0].x,
				enemyPosition[0].y
			);
		} else {
			this.shotAngle = 0;
		}
	}

	decide() {
		this.decision = "shoot";

		this.takeTheShot();

		if (this.movesLeft < 50) {
			this.movesLeft++;
			this.decision = "left";
		} else if (this.randInt(0, 1) == 1) {
			this.movesUp++;
			this.decision = "up";
			if (this.movesUp > 50) {
				this.movesDown++;
				this.decision = "down";
				if (this.movesDown > 50) {
					this.movesUp = 0;
					this.movesDown = 0;
					this.decision = "up";
				}
			}
		}

		return this.decision;
	}
}

class Spiderman {
	constructor() {
		this.name = "Spiderman";
		this.color = "red";
		this.armor = 1;
		this.scanDistance = 1;
		this.bulletPower = 0;

		this.decision = "shoot";
		this.shotAngle = 0;
		this.movesLeft = 0;
		this.movesUp = 0;
		this.movesDown = 0;
		this.multiplier = 1;
	}
	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	decide() {
		this.decision = "shoot";
		if (this.movesLeft < 50) {
			this.movesLeft++;
			this.decision = "up";
		}
		this.shotAngle = this.shotAngle + 3 * this.multiplier;
		this.shotAngle %= 181;
		return this.decision;
	}
}

class CornerKiller {
	constructor() {
		this.name = "CornerKiller";
		this.color = "orange";
		this.armor = 1;
		this.scanDistance = 1;
		this.bulletPower = 0;

		this.decision = "shoot";
		this.shotAngle = 0;

		this.movesLeft = 0;
		this.movesUp = 0;
		this.movesDown = 0;
		this.multiplier = 1;
		this.toggle = true;
	}
	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	decide() {
		// sun's out, guns out
		this.decision = "shoot";
		let me = this.whereAmI();
		// in bottom right corner
		if (me.x >= 50 && me.y >= 50) {
			if (this.toggle == true) {
				this.decision = "down";
			} else {
				this.decision = "right";
			}
			// top right corner
		} else if (me.x >= 50 && me.y < 50) {
			if (this.toggle == true) {
				this.decision = "up";
			} else {
				this.decision = "right";
			}
			// top left corner
		} else if (me.x < 50 && me.y < 50) {
			if (this.toggle == true) {
				this.decision = "up";
			} else {
				this.decision = "left";
			}
			// bottom left corner
		} else if (me.x < 50 && me.y >= 50) {
			if (this.toggle == true) {
				this.decision = "down";
			} else {
				this.decision = "left";
			}
		}
		//are we in the corner?
		// top left
		if (me.x <= 2 && me.y <= 2) {
			this.decision = "shoot";
			this.shotAngle = 45 + this.randInt(-45, 45);
			// bottom left
		} else if (me.x <= 2 && me.y >= 98) {
			this.decision = "shoot";
			this.shotAngle = -45 + this.randInt(-45, 45);
			// top right
		} else if (me.x >= 98 && me.y <= 2) {
			this.decision = "shoot";
			this.shotAngle = 125 + this.randInt(-45, 45);
			// bottom right
		} else if (me.x >= 98 && me.y >= 98) {
			this.decision = "shoot";
			this.shotAngle = -125 + this.randInt(-45, 45);
		}
		// change which decision is being made
		this.toggle = !this.toggle;
		return this.decision;
	}
}

// stored scope of all classes of competitors
const playersScope = {
	CircleShot,
	Chaos,
	CornerKiller,
	Sniper,
	Spiderman
};

// Game logic
let bot1;
let bot2;

// default bots
let queuedBot1;
let queuedBot2;

// Function to update the game at each frame interval (e.g., every 100ms)
function updateGame() {
	bot1.move();
	bot2.move();
}

// assigns brains and sets the starting positions of the bots
function setMatchup(brain1, brain2) {
	// random integer generator
	function randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	// minimum distance to be apart
	let d = 50;
	// check to see if they're too close together
	function distance(x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	}

	let x1, y1, x2, y2;

	do {
		// Generate random positions for bot 1
		x1 = randInt(10, 90);
		y1 = randInt(10, 90);

		// Generate random positions for bot 2
		x2 = randInt(10, 90);
		y2 = randInt(10, 90);
	} while (distance(x1, y1, x2, y2) <= d);

	bot1 = new Bot(x1, y1, brain1);
	bot2 = new Bot(x2, y2, brain2);
}

// function to allow buttons to change bots that will be fighting
function changeBot(whichBot = 1, botName = "Chaos") {
	let botSpan = document.querySelector(`.s${whichBot}`);
	let botInstance = setBot(botName);

	if (botInstance && botInstance.color) {
		botSpan.style.background = botInstance.color;
	} else {
		console.error("Bot instance or color not found for:", botName);
	}
	let selectId = whichBot === 1 ? "bot-select-1" : "bot-select-2";
	let currentSelectedBot = document.getElementById(selectId).value;

	// Update the value of the corresponding select element if the new bot name is different
	if (botName !== currentSelectedBot) {
		document.getElementById(selectId).value = botName;
	}
	switch (whichBot) {
		case 1:
			queuedBot1 = setBot(botName);
			bot1Name = botName;
			break;
		case 2:
			queuedBot2 = setBot(botName);
			bot2Name = botName;
			break;
	}
}

// CHEAT CHECKS
function checkForCheaters(bot) {
	function getClassCodeAsString(classInstance) {
		// Make sure the input is an object
		if (typeof classInstance !== "object" || classInstance === null) {
			throw new Error("Input must be an object.");
		}

		// Get the constructor function of the instance
		const constructor = classInstance.constructor;

		// Get the code of the constructor function as a string
		const constructorCode = constructor.toString();

		// Use regular expressions to extract the class body from the constructor function code
		const classBodyMatch = constructorCode.match(/class\s+(\w+)\s*{([\s\S]*)}/);

		if (!classBodyMatch) {
			throw new Error("Failed to extract the class body.");
		}

		// Extract the class name and the class body
		const className = classBodyMatch[1];
		const classBody = classBodyMatch[2];

		return `class ${className} {${classBody}}`;
	}

	// Check for access to arena.bots or arena.projectiles within functions
	let brainString = getClassCodeAsString(bot.brain);
	if (
		brainString.includes("arena.bots") ||
		brainString.includes("arena.projectiles")
	) {
		console.error(
			`Cheating detected for Bot ${bot.brain.name}: Access to arena.bots or arena.projectiles within a function not allowed!`
		);
		return false;
	}
	return true;
}

// used to re-instantiate classes
let bot1Name = "CircleShot";
let bot2Name = "Sniper";

// set up the bots for the arena
function stageBots() {
	// reinstantiate the selected bot classes (resets all local vars)
	changeBot(1, bot1Name);
	changeBot(2, bot2Name);

	// reassigns bot1 and bot2
	setMatchup(queuedBot1, queuedBot2);

	// add the bots to be tracked in the arena
	arena.bots.push(bot1);
	arena.bots.push(bot2);

	// Check for cheaters before starting the game
	const allBots = [bot1, bot2];
	const noCheaters = allBots.every(checkForCheaters);
	if (!noCheaters) {
		console.error("Game cannot start due to cheating!");
		return;
	}
}

// updates the game every frameInterval
function animateLoop() {
	let lastTimestamp = 0;
	let elapsedTime = 0;

	// animation loop
	function animateGame(timestamp) {
		if (isGameRunning) {
			if (!lastTimestamp) lastTimestamp = timestamp;
			const elapsedTime = timestamp - lastTimestamp;

			// Check if enough time has elapsed to update the game
			if (elapsedTime >= frameInterval) {
				updateGame();
				lastTimestamp = timestamp - (elapsedTime % frameInterval);
			}
			requestAnimationFrame(animateGame);
		}
	}

	// Start the game loop
	requestAnimationFrame(animateGame);
}
//timeouts (to clear so we don't get multiple)
let t2, t1, tf, tGo;
function countDown() {
	function count(num) {
		const countDownText = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"text"
		);
		countDownText.setAttribute("font-family", `'Roboto', sans-serif`);
		countDownText.setAttribute("x", 50);
		countDownText.setAttribute("y", 50);
		countDownText.setAttribute("text-anchor", `middle`);
		countDownText.setAttribute("dominant-baseline", `middle`);
		countDownText.setAttribute("font-size", `15`);
		countDownText.setAttribute("font-weight", `900`);
		countDownText.setAttribute("fill", `gold`);
		countDownText.textContent = num;
		const anim = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"animate"
		);
		anim.setAttribute("attributeName", "opacity");
		anim.setAttribute("values", "1;0");
		anim.setAttribute("dur", 1);
		anim.setAttribute("fill", "freeze");
		anim.setAttribute("begin", "indefinite");
		anim.setAttribute("repeatCount", "none");
		anim.setAttribute("keyTimes", "0;1");
		anim.setAttribute("keySplines", "0.70 0.10 0.05 0.85");
		anim.setAttribute("calcMode", "spline");
		countDownText.appendChild(anim);
		arenaSVG.appendChild(countDownText);
		// start animations
		anim.beginElement();
		setTimeout(() => {
			countDownText.remove();
		}, 1000);
	}
	clearTimeout(t2);
	clearTimeout(t1);
	clearTimeout(tf);
	clearTimeout(tGo);
	count(3);
	t2 = setTimeout(() => {
		count(2);
	}, 1000);
	t1 = setTimeout(() => {
		count(1);
	}, 2000);
	tf = setTimeout(() => {
		count("FIGHT!");
	}, 3000);
	// start after the countdown
	tGo = setTimeout(() => {
		// toggle the running variable
		isGameRunning = true;

		// begin the animation loop
		animateLoop();
	}, 3700);
}

// start it up!
function startGame() {
	// end the current game if there is one
	endGame();

	// select and ready the bots for battle!
	stageBots();

	// give the old bullets a chance to skidaddle off screen
	// since I can't friggin figure out how to clear em when we start a new game
	countDown();
}

// stop animating and end the game
function endGame() {
	isGameRunning = false;

	// set the svg to just the background
	// TODO: still need to stop tracking the projectiles from the last game
	arenaSVG.innerHTML = gameBG;

	clearProjectilesFromArena();

	// reset arena
	arena = new Arena(100, 100);
}

// HELPERS

function clearProjectilesFromArena() {
	for (const bot of arena.bots) {
		bot.projectilesList.removeAll();
	}
}
function logMe(str) {
	let span = document.createElement("span");
	span.innerText = str;
	span.style.display = "block";
	span.style.padding = "5px";
	span.style.border = "1px solid #111";
	span.style.borderRadius = "10px";
	span.style.boxSizing = "border-box";
	document.querySelector("#log").prepend(span);
}

// menu stuff
function toggleRight() {
	const element = document.querySelector(".menuArea");
	element.classList.toggle("closed");
}

function changeBulletColor(col) {
	bulletColor = col;
}
function changeShieldColor(col) {
	shieldColor = col;
}

// import modal
const dialog1 = document.querySelectorAll("dialog")[1];

dialog1.addEventListener("click", (e) => {
	const dialogDimensions = dialog1.getBoundingClientRect();
	if (
		e.clientX < dialogDimensions.left ||
		e.clientX > dialogDimensions.right ||
		e.clientY < dialogDimensions.top ||
		e.clientY > dialogDimensions.bottom
	) {
		dialog1.close();
	}
});
document.querySelector("#import").addEventListener("click", () => {
	dialog1.showModal();
});

document.querySelectorAll(".closeDialog")[1].addEventListener("click", () => {
	dialog1.close();
});
// info modal
const dialog0 = document.querySelectorAll("dialog")[0];

dialog0.addEventListener("click", (e) => {
	const dialogDimensions = dialog0.getBoundingClientRect();
	if (
		e.clientX < dialogDimensions.left ||
		e.clientX > dialogDimensions.right ||
		e.clientY < dialogDimensions.top ||
		e.clientY > dialogDimensions.bottom
	) {
		dialog0.close();
	}
});
document.querySelector("#open").addEventListener("click", () => {
	dialog0.showModal();
});

document.querySelectorAll(".closeDialog")[0].addEventListener("click", () => {
	dialog0.close();
});

// prism css
// all pre tags on the page
const pres = document.getElementsByTagName("pre");

// reformat html of pre tags
if (pres !== null) {
	for (let i = 0; i < pres.length; i++) {
		if (window.CP.shouldStopExecution(0)) break;
		// check if its a pre tag with a prism class
		if (isPrismClass(pres[i])) {
			// insert code and copy element
			pres[
				i
			].innerHTML = `<code class="${pres[i].className}">${pres[i].innerHTML}</code>`;
		}
	}
	window.CP.exitedLoop(0);
}

// helper function
function isPrismClass(preTag) {
	return preTag.className.substring(0, 8) === "language";
}

// switcher for the brain
function setBot(brain) {
	// Check if the class exists in the global scope
	if (typeof playersScope[brain] === "function") {
		// Create an instance of the class if it exists
		return new playersScope[brain]();
	} else {
		// Handle the case where the class does not exist
		console.error("Class not found:", brain);
		return null;
	}
}

// Function to fetch the JavaScript file from the URL and add the class to playersScope
async function addClassFromUrl() {
	const urlInput = document.getElementById("urlInput").value;
	try {
		const module = await import(urlInput);
		console.log("Module loaded:", module);

		const newClass = module.default; // Access the default export

		if (newClass) {
			const className = newClass.name; // Retrieve the class name
			playersScope[className] = newClass;
			populateSelectOptions("bot-select-1");
			populateSelectOptions("bot-select-2");
			const newPlayer = document.createElement("span");
			newPlayer.classList.add("newPlayer");
			newPlayer.textContent = className;
			document.querySelector(".importedPlayers").appendChild(newPlayer);
			logMe(`Player "${className}" added!`);
		} else {
			console.error(`Class not found in ${urlInput}`);
		}
	} catch (error) {
		console.error("Error:", error);
	}
}

function populateSelectOptions(selectId) {
	const selectElement = document.getElementById(selectId);
	// Clear existing options
	while (selectElement.firstChild) {
		selectElement.removeChild(selectElement.firstChild);
	}
	for (const className in playersScope) {
		if (playersScope.hasOwnProperty(className)) {
			const option = document.createElement("option");
			option.value = className;
			option.textContent = className;
			selectElement.appendChild(option);
		}
	}
}

populateSelectOptions("bot-select-1");
populateSelectOptions("bot-select-2");

// default matchup
changeBot(1, "CircleShot");
changeBot(2, "Sniper");

// add btn listeners
document.querySelector(".endBtn").addEventListener("click", endGame);
document.querySelector(".startBtn").addEventListener("click", startGame);
document
	.querySelector(".rightPlayerBtn")
	.addEventListener("click", toggleRight);

//CHANGE MEEEEE
class CustomBrain {
	constructor() {
		this.name = "Bojangles";
		this.color = "purple";

		//**POWERS (must total < 5)**
		this.armor = 1;
		this.bulletPower = 0;
		this.scanDistance = 1;
		//***************************

		// your logic below should change these 2 variables
		this.decision = "shoot";
		this.shotAngle = 0;

		// you can add additional variables here if you want, but be sure not to overwrite any existing variables
	}

	/* 
	these calls are available any time and do NOT take the place of a decision
	
	this.scan();
	will either return:
	1. an object with the enemy's x and y (if an enemy is within the scan radius)
	2. an empty object (if no enemy within the radius)
	
	this.whereAmI();
	will return your x and y in an object (ex: {x: 25, y: 61})
	*/
	// random integer generator
	randInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	// the decide call gets made every time the game updates (e.g. every 100ms)
	decide() {
		if (this.randInt(0, 1) == 1) {
			this.shotAngle = 180;
		} else {
			this.shotAngle = 0;
		}
		// Your decision-making logic goes here (e.g., move left, shoot, etc.)
		return this.decision;
	}
}
