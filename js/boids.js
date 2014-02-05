var canvasWidth = 960;
var canvasHeight = 450;

paper.install(window);


window.onload = function()
{
	paper.setup("mainCanvas");

	var flock = new Flock();
	for(var i=0; i<55; i++)
	{
		var boid = new Boid(new Point(canvasWidth/2+(Math.random()*100+50), canvasHeight/2+(Math.random()*100+50)));
		boid.init();
		flock.addBoid(boid);
	}

	view.onFrame = function(event){
		flock.run();
	}
}


// -------------------------------------
// ---- Flock Class BEGIN

Flock = function()
{
	this.boids = new Array();

	this.run = function()
	{
		if(this.boids){
			for(var i=0; i<this.boids.length; i++)
			{
				this.boids[i].run(this.boids);
			}
		}
	}

	this.addBoid = function(boid)
	{
		this.boids.push(boid);
	}

}

plusOrMinus = function()
{
	return Math.random() < 0.5 ? -1 : 1;
}


// ---- Flock Class END
// -------------------------------------

// -------------------------------------
// ---- Boid Class BEGIN

Boid = function(location)
{
	this.shape = new Group();

	this.accVector = new Path();
	this.body = new Path();

	this.location = location;
	this.velocity = new Point();
	this.acceleration = new Point(0,0);

	var pathRadius = 3;
	var maxSpeed = 4;
	var maxForce = 0.05;

	var orientation = 0;
	var lastOrientation = 0;
	var lastLocation;

	this.init = function()
	{
		this.velocity.x = plusOrMinus();
		this.velocity.y = plusOrMinus();

		//console.log(this.velocity.x + ' ' + this.velocity.y + ' ' + (this.velocity.angle + 90));

		this.body.strokeColor = 'white';
		this.body.strokeWidth = 2;

		this.body.add(new Point(0, -pathRadius*2));
		this.body.add(new Point(-pathRadius, pathRadius*2));
		this.body.add(new Point(pathRadius, pathRadius*2));	

		this.body.position = this.location;
		this.body.fillColor = new RgbColor(255,255,255, 0.5);

		this.body.closed = true;

		this.shape.addChild(this.body);
	}

	this.run = function(boids)
	{
		this.flock(boids);
		this.update();
		this.borders();
		this.render();
	}

	this.flock = function(boids)
	{
		var separation = this.separate(boids);
		var alignment = this.align(boids);
		var cohesion = this.cohesion(boids);

		separation.length *= 1.5;
		alignment.length *= 1.0;
		cohesion.length *= 1.0;
	
		this.acceleration = this.acceleration.add(separation);
		this.acceleration = this.acceleration.add(alignment);
		this.acceleration = this.acceleration.add(cohesion);

	}

	this.update = function()
	{
		lastLocation = this.location.clone();

		this.velocity.x += this.acceleration.x;
		this.velocity.y += this.acceleration.y;
		this.velocity.length = Math.min( maxSpeed, this.velocity.length );

		this.location.x += this.velocity.x;
		this.location.y += this.velocity.y;

		this.acceleration.length = 0;
	}

	this.seek = function(target)
	{
		var steer = this.steer(target, false);
		this.acceleration.x += steer.x;
		this.acceleration.y += steer.y; 
	}

	this.arrive = function(target)
	{
		var steer = this.steer(target, true);
		this.acceleration.x += steer.x;
		this.acceleration.y += steer.y; 
	}

	this.steer = function(target, slowdown)
	{
		var steer = new Point(0,0);
		var desired	= new Point( target.x - this.location.x, target.y - this.location.y );
		var distance = desired.length;

		if(distance > 0)
		{
			if((slowdown) && (distance < 100.0)) desired.length = maxSpeed * (distance/100);
			else desired.length = maxSpeed;

			steer = desired.subtract(this.velocity);

			// Limit Steer to maxForce
			steer.length = Math.min( maxForce, steer.length );
		}
		return steer;
	}

	var acc = 0;
	var oacc = 0;
	var ang = 0;

	this.render = function()
	{
		var locVector = new Point( this.location.x - lastLocation.x, this.location.y - lastLocation.y );
		orientation = (locVector.angle+90);
		this.shape.position = this.location.clone();
		this.shape.rotate(orientation - lastOrientation);
		lastOrientation = orientation;
	}

	this.borders = function()
	{
		if(this.location.x < -pathRadius) this.location.x = canvasWidth + pathRadius;
		if(this.location.y < -pathRadius) this.location.y = canvasHeight + pathRadius;
		if(this.location.x > canvasWidth+pathRadius) this.location.x = -pathRadius;
		if(this.location.y > canvasHeight+pathRadius) this.location.y = -pathRadius;

	}

	this.separate = function(boids)
	{
		var desiredSeparation = 20.0;
		var steer = new Point(0,0);

		var count = 0;

		for(var i=0; i<boids.length; i++)
		{
			var other = boids[i];
			var distance = this.location.getDistance(other.location);

			if((distance > 0) && (distance < desiredSeparation))
			{
				var diffVector = this.location.subtract(other.location);
				diffVector = diffVector.normalize();
				diffVector.divide(distance);

				steer.x += diffVector.x;
				steer.y += diffVector.y;
				count++;
			}
		}

		if(count > 0){
			steer.length /= count;
		}

		if(steer.length > 0){
			steer = steer.normalize();
			steer = steer.multiply(maxSpeed);
			steer.x -= this.velocity.x;
			steer.y -= this.velocity.y;

			steer.length = Math.min( maxForce, steer.length );
		}

		return steer;

	}

	this.align = function(boids)
	{
		var neighbDist = 25.0;
		var steer = new Point(0, 0);
		var count = 0;
		for(var i=0; i<boids.length; i++)
		{
			var other = boids[i];
			var distance = this.location.getDistance(other.location);
			if((distance.length > 0) && (distance.length < neighbDist))
			{
				steer.x += other.velocity.x;
				steer.y += other.velocity.y;
				count++;
			}
		}

		if(count > 0)
		{
			steer.length /= count;
		}

		if(steer.length > 0)
		{
			steer = steer.normalize();
			steer = steer.multiply(maxSpeed);
			steer.x -= this.velocity.x;
			steer.y -= this.velocity.y;

			steer.length = Math.min( maxForce, steer.length );
		}

		return steer;
	}

	this.cohesion = function(boids)
	{
		var neighbDist = 25.0;	
		var sum = new Point(0,0);
		var count = 0;

		for(var i=0; i<boids.length; i++)
		{
			var other = boids[i];
			var distance = this.location.getDistance(other.location);
			
			if((distance > 0) && (distance < neighbDist))
			{
				sum.x += other.velocity.x;
				sum.y += other.velocity.y;
				count++;
			}	
		}

		if(count > 0)
		{
			sum.length /= count;
			return this.steer(sum, false);
		}
		return sum;
	}


}

// ---- Flock Class END
// -------------------------------------
