/*
    Javascript Space Game
    By Frank Force 2021

*/

'use strict';

class GameObject extends EngineObject 
{
    constructor(pos, size, tileIndex, tileSize, angle)
    {
        super(pos, size, tileIndex, tileSize, angle);
        this.isGameObject = 1;
        this.health = this.healthMax = this.canBurn = 0;
        this.burnDelay = .1;
        this.burnTime = 3;
        this.damageTimer = new Timer;
        this.burnDelayTimer = new Timer;
        this.burnTimer = new Timer;
        this.additiveColor = new Color(0,0,0,0);
    }

    inUpdateWindow() { return isOverlapping(this.pos, this.size, cameraPos, updateWindowSize); }

    update()
    {
        if (this.parent || this.persistent || !this.groundObject || this.inUpdateWindow()) // pause physics if outside update window
            super.update();

        if (!this.isLavaRock)
        {
            if (!this.isDead() && this.damageTimer.isSet())
            {
                // flash white when damaged
                const a = .5*percent(this.damageTimer.get(), 0, .15);
                this.additiveColor = new Color(a,a,a,0);
            }
            else
                this.additiveColor = new Color(0,0,0,0);
        }
        
        if (!this.parent && this.pos.y < -1)
        {
            // kill and destroy if fall below level
            this.kill();
            this.persistent || this.destroy();
        }
        else if (this.burnTime)
        {
            if (this.burnTimer.isSet())
            {
                // burning
                if (this.burnTimer.elapsed())
                {
                    this.kill();
                    if (this.fireEmitter)
                        this.fireEmitter.emitRate = 0;
                }
                else if (rand() < .01)
                {
                    // random chance to spread fire
                    const spreadRadius = 2;
                    debugFire && debugCircle(this.pos, spreadRadius, '#f00', 1);
                    forEachObject(this.pos, spreadRadius, (o)=>o.isGameObject && o.burn());
                }
            }
            else if (this.burnDelayTimer.elapsed())
            {
                // finished waiting to burn
                this.burn(1);
            }
        }
    }
 
    render()
    {
        drawTile(this.pos, this.size, this.tileIndex, this.tileSize, this.color ? this.color.scale(this.burnColorPercent(),1) : undefined, this.angle, this.mirror, this.additiveColor);
    }
    
    burnColorPercent() { return lerp(this.burnTimer.getPercent(), .2, 1); }

    burn(instant)
    {
        if (!this.canBurn)
            return;

        if (godMode && this.isPlayer)
            return;

        if (this.team == team_player)
        {
            // safety window after spawn
            if (godMode || this.getAliveTime() < 2)
                return;
        }

        if (instant)
        {
            if (!this.burnTimer.isSet())
            {
                this.burnTimer.set(this.burnTime*rand(1.5, 1));
                this.fireEmitter = makeFire();
                this.addChild(this.fireEmitter);
            }
        }
        else
            this.burnDelayTimer.isSet() || this.burnDelayTimer.set(this.burnDelay*rand(1.5, 1));
    }

    extinguish()
    {
        if (this.fireEmitter && this.fireEmitter.emitRate == 0)
            return;

        // stop burning
        this.burnTimer.unset();
        this.burnDelayTimer.unset();
        if (this.fireEmitter)
            this.fireEmitter.destroy();
        this.fireEmitter = 0;
    }
    
    heal(health)
    {
        assert(health >= 0);
        if (this.isDead())
            return 0;
        
        // apply healing and return amount healed
        return this.health - (this.health = min(this.health + health, this.healthMax));
    }

    damage(damage, damagingObject)
    {
        ASSERT(damage >= 0);
        if (this.isDead())
            return 0;
        
        // set damage timer;
        this.damageTimer.set();
        for(const child of this.children)
            child.damageTimer && child.damageTimer.set();

        // apply damage and kill if necessary
        const newHealth = max(this.health - damage, 0);
        if (!newHealth)
            this.kill(damagingObject);

        // set new health and return amount damaged
        return this.health - (this.health = newHealth);
    }

    isDead()                { return !this.health; }
    kill(damagingObject)    { this.destroy(); }

    collideWithObject(o)
    {
        if (o.isLavaRock && this.canBurn)
        {
            if (levelWarmup)
            {
                this.destroy();
                return 1;
            }
            this.burn();
        }
        return 1;
    }
}

///////////////////////////////////////////////////////////////////////////////

const propType_crate_wood           = 0;
const propType_crate_explosive      = 1;
const propType_crate_metal          = 2;
const propType_barrel_explosive     = 3;
const propType_barrel_water         = 4;
const propType_barrel_metal         = 5;
const propType_barrel_highExplosive = 6;
const propType_rock                 = 7;
const propType_rock_lava            = 8;
const propType_count                = 9;

class Prop extends GameObject 
{
    constructor(pos, typeOverride) 
    { 
        super(pos);

        const type = this.type = (typeOverride != undefined ? typeOverride : rand()**2*propType_count|0);
        let health = 5;
        this.tileIndex = 16;
        this.explosionSize = 0;
        if (this.type == propType_crate_wood)
        {
            this.color = new Color(1,.5,0);
            this.canBurn = 1;
        }
        else if (this.type == propType_crate_metal)
        {
            this.color = new Color(.9,.9,1);
            health = 10;
        }
        else if (this.type == propType_crate_explosive)
        {
            this.color = new Color(.3,.3,.3);
            this.canBurn = 1;
            this.explosionSize = 2;
            health = 1e3;
        }
        else if (this.type == propType_barrel_metal)
        {
            this.tileIndex = 17;
            this.color = new Color(.9,.9,1);
            health = 10;
        }
        else if (this.type == propType_barrel_explosive)
        {
            this.tileIndex = 17;
            this.color = new Color(.3,.3,.3);
            this.canBurn = 1;
            this.explosionSize = 2;
            health = 1e3;
        }
        else if (this.type == propType_barrel_highExplosive)
        {
            this.tileIndex = 17;
            this.color = new Color(1,.1,.1);
            this.canBurn = 1;
            this.explosionSize = 3;
            this.burnTimeDelay = 0;
            this.burnTime = rand(.5,.1);
            health = 1e3;
        }
        else if (this.type == propType_barrel_water)
        {
            this.tileIndex = 17;
            this.color = new Color(0,.6,1);
            health = .01;
        }
        else if (this.type == propType_rock || this.type == propType_rock_lava)
        {
            this.tileIndex = 18;
            this.color = new Color(.8,.8,.8).mutate(.2);
            health = 30;
            this.mass *= 4;
            if (rand() < .2)
            {
                health = 99;
                this.mass *= 4;
                this.size = this.size.scale(2);
                this.pos.y += .5;
            }
            this.isCrushing = 1;

            if (this.type == propType_rock_lava)
            {
                this.color = new Color(1,.9,0);
                this.additiveColor = new Color(1,0,0);
                this.isLavaRock = 1;    
            }
        }

        // randomly angle and flip axis (90 degree rotation)
        this.angle = (rand(4)|0)*PI/2;
        if (rand() < .5)
            this.size = this.size.flip();

        this.mirror = rand() < .5;
        this.health = this.healthMax = health;
        this.setCollision(1, 1);
    }
 
    update()
    {
        const oldVelocity = this.velocity.copy();
        super.update();

        // apply collision damage
        const deltaSpeedSquared = this.velocity.subtract(oldVelocity).lengthSquared();
        deltaSpeedSquared > .05 && this.damage(2*deltaSpeedSquared);
    }

    damage(damage, damagingObject)
    {
        (this.explosionSize || this.type == propType_crate_wood && rand() < .1) && this.burn();
        super.damage(damage, damagingObject);
    }

    kill()
    {
        if (this.destroyed) return;

        if (this.type == propType_barrel_water)
            makeWater(this.pos);

        this.destroy();
        makeDebris(this.pos, this.color);
        
        this.explosionSize ? 
            explosion(this.pos, this.explosionSize) :
            playSound(sound_destroyTile, this.pos);
    }
}

///////////////////////////////////////////////////////////////////////////////

let checkpointPos, activeCheckpoint, checkpointTimer = new Timer;

class Checkpoint extends GameObject 
{
    constructor(pos)
    {
        super(pos.int().add(vec2(.5)))
        this.renderOrder = tileRenderOrder-1;
        this.isCheckpoint = 1;
        for(let x=3;x--;)
        for(let y=6;y--;)
            setTileCollisionData(pos.subtract(vec2(x-1,1-y)), y ? tileType_empty : tileType_solid);
    }

    update()
    {
        if (!this.inUpdateWindow())
            return; // ignore offscreen objects

        // check if player is near
        for(const player of players)
            !player.isDead() && this.pos.distanceSquared(player.pos) < 1 && this.setActive();
    }

    setActive()
    {
        if (activeCheckpoint != this && !levelWarmup)
            playSound(sound_checkpoint, this.pos);

        checkpointPos = this.pos;
        activeCheckpoint = this;
        checkpointTimer.set(.1);
    }

    render()
    {
        // draw flag
        const height = 4;
        const color = activeCheckpoint == this ? new Color(1,0,0) : new Color;
        const a = Math.sin(time*4+this.pos.x);
        drawTile(this.pos.add(vec2(.5,height-.3-.5-.03*a)), vec2(1,.6), 14, undefined, color, a*.06);  
        drawRect(this.pos.add(vec2(0,height/2-.5)), vec2(.1,height), new Color(.9,.9,.9));
    }
}

///////////////////////////////////////////////////////////////////////////////

class Grenade extends GameObject
{
    constructor(pos, attacker=0) 
    {
        super(pos, vec2(.2), 5, vec2(8));

        this.health = this.healthMax = 1e3;
        this.beepTimer = new Timer(1);
        this.elasticity = .3;
        this.friction   = .9;
        this.angleDamping = .96;
        this.team = attacker ? attacker.team : team_none;
        this.setCollision();
    }

    update()
    {
        super.update();

        if (this.getAliveTime() > 3)
        {
            explosion(this.pos, 3, this.team);
            this.destroy();
            return;
        }

        if (this.beepTimer.elapsed())
        {
            playSound(sound_grenade, this.pos)
            this.beepTimer.set(1);
        }

        alertEnemies(this.pos, this.pos, 2);
    }
       
    render()
    {
        drawTile(this.pos, vec2(.5), this.tileIndex, this.tileSize, this.color, this.angle);

        const a = this.getAliveTime();
        setBlendMode(1);
        drawTile(this.pos, vec2(2), 0, vec2(16), new Color(1,0,0,.2-.2*Math.cos(a*2*PI)));
        drawTile(this.pos, vec2(1), 0, vec2(16), new Color(1,0,0,.2-.2*Math.cos(a*2*PI)));
        drawTile(this.pos, vec2(.5), 0, vec2(16), new Color(1,1,1,.2-.2*Math.cos(a*2*PI)));
        setBlendMode(0);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Green TNT block thrown by Player 2

class TNTGrenade extends Grenade
{
    constructor(pos, attacker=0)
    {
        super(pos, attacker);
        this.color = new Color(.1, .75, .1); // green
    }

    render()
    {
        // green box body
        drawRect(this.pos, vec2(.52, .52), new Color(.05, .5, .05), this.angle);
        drawRect(this.pos, vec2(.46, .46), new Color(.15, .85, .15), this.angle);
        // red TNT cross stripes
        drawRect(this.pos, vec2(.44, .13), new Color(.9, .1, .1), this.angle);
        drawRect(this.pos, vec2(.13, .44), new Color(.9, .1, .1), this.angle);

        // pulsing green glow
        const a = this.getAliveTime();
        const pulse = .2 - .2 * Math.cos(a * 2 * PI);
        setBlendMode(1);
        drawTile(this.pos, vec2(2),  0, vec2(16), new Color(0, 1, 0, pulse));
        drawTile(this.pos, vec2(1),  0, vec2(16), new Color(0, 1, 0, pulse));
        drawTile(this.pos, vec2(.5), 0, vec2(16), new Color(1, 1, 1, pulse));
        setBlendMode(0);
    }
}

///////////////////////////////////////////////////////////////////////////////

class Weapon extends EngineObject 
{
    constructor(pos, parent) 
    { 
        super(pos, vec2(.6), 4, vec2(8));

        // weapon settings
        this.isWeapon = 1;
        this.fireTimeBuffer = this.localAngle = 0;
        this.recoilTimer = new Timer;

        this.addChild(this.shellEmitter = new ParticleEmitter(
            vec2(), 0, 0, 0, .1,  // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined, // tileIndex, tileSize
            new Color(1,.8,.5), new Color(.9,.7,.5), // colorStartA, colorStartB
            new Color(1,.8,.5), new Color(.9,.7,.5), // colorEndA, colorEndB
            3, .1, .1, .15, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            1, .95, 1, 0, 0,    // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .1, 1              // randomness, collide, additive, randomColorLinear, renderOrder
        ));
        this.shellEmitter.elasticity = .5;
        this.shellEmitter.particleDestroyCallback = persistentParticleDestroyCallback;
        this.renderOrder = parent.renderOrder+1;

        parent.weapon = this;
        parent.addChild(this, this.localOffset = vec2(.55,0));
    }

    update()
    {
        super.update();

        const fireRate = 8;
        const bulletSpeed = .5;
        const bulletRange = 8;
        const spread = .1;

        this.mirror = this.parent.mirror;
        this.fireTimeBuffer += timeDelta;

        if (this.recoilTimer.isSet())
            this.localAngle = lerp(this.recoilTimer.getPercent(), 0, this.localAngle);

        if (this.triggerIsDown)
        {
            // slow down enemy bullets
            const speed = bulletSpeed * (this.parent.team == team_player ? 1 : .5);
            const rate = 1/fireRate;
            for(; this.fireTimeBuffer > 0; this.fireTimeBuffer -= rate)
            {
                this.localAngle = -rand(.2,.15);
                this.recoilTimer.set(rand(.4,.3));
                const bullet = new Bullet(this.pos, this.parent);
                const direction = vec2(this.getMirrorSign(speed), 0);
                bullet.velocity = direction.rotate(rand(spread,-spread));
                bullet.range = bulletRange;

                this.shellEmitter.localAngle = -.8*this.getMirrorSign();
                this.shellEmitter.emitParticle();
                if (this.parent)
                {
                    // knockback
                    //if (!this.parent.groundObject || this.parent.velocity.lengthSquared()>.1)
                    //this.parent.applyForce(direction.scale(-.02));
                }

                playSound(sound_shoot, this.pos);

                // alert enemies
                this.parent.isPlayer && alertEnemies(this.pos, this.pos, 4);
            }
        }
        else
            this.fireTimeBuffer = min(this.fireTimeBuffer, 0);
    }
}

///////////////////////////////////////////////////////////////////////////////

class Bullet extends EngineObject 
{
    constructor(pos, attacker) 
    { 
        super(pos, vec2(0));
        this.color = new Color(1,1,0,1);
        this.lastVelocity = this.velocity;
        this.setCollision();

        this.damage = this.damping = 1;
        this.gravityScale = 0;
        this.attacker = attacker;
        this.team = attacker.team;
    }

    update()
    {
        this.lastVelocity = this.velocity;
        super.update();

        this.range -= this.velocity.length();
        if (this.range < 0 )
        {
            const emitter = new ParticleEmitter(
                this.pos, .2, .1, 100, PI, // pos, emitSize, emitTime, emitRate, emiteCone
                0, undefined,     // tileIndex, tileSize
                new Color(1,1,0,.5), new Color(1,1,1,.5), // colorStartA, colorStartB
                new Color(1,1,0,0), new Color(1,1,1,0), // colorEndA, colorEndB
                .1, .5, .1, .1, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
                1, 1, .5, PI, .1,  // damping, angleDamping, gravityScale, particleCone, fadeRate, 
                .5, 0, 1           // randomness, collide, additive, randomColorLinear, renderOrder
            );

            this.destroy();
            return;
        }

        // check if hit someone
        forEachObject(this.pos, this.size, (o)=>
        {
            if (o.isGameObject && !o.parent && o.team != this.team)
            if (!o.dodgeTimer || !o.dodgeTimer.active())
                this.collideWithObject(o)
        });
    }
    
    collideWithObject(o)
    {
        if (o.isGameObject)
        {
            if (o.blockProjectile && o.blockProjectile(this))
            {
                this.kill();
                return 1;
            }

            o.damage(this.damage, this);
            o.applyForce(this.velocity.scale(.1));
            if (o.isCharacter)
            {
                playSound(sound_walk, this.pos);
                this.destroy();
            }
            else
                this.kill();
        }
    
        return 1; 
    }

    collideWithTile(data, pos)
    {
        if (data <= 0)
            return 0;
            
        const destroyTileChance = data == tileType_glass ? 1 : data == tileType_dirt ? .2 : .05;
        rand() < destroyTileChance && destroyTile(pos);
        this.kill();

        return 1; 
    }

    kill()
    {
        if (this.destroyed)
            return;

        const emitter = new ParticleEmitter(
            this.pos, 0, .1, 100, .2, // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined,     // tileIndex, tileSize
            new Color(1,1,0), new Color(1,0,0), // colorStartA, colorStartB
            new Color(1,1,0), new Color(1,0,0), // colorEndA, colorEndB
            .2, .2, 0, .1, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            1, 1, .5, PI, .1,  // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .5, 1, 1           // randomness, collide, additive, randomColorLinear, renderOrder
        );
        emitter.trailScale = 1;
        emitter.angle = this.lastVelocity.angle() + PI;

        //playSound(sound_bulletHit, this.pos);
        this.destroy();
    }

    render()
    {
        drawRect(this.pos, vec2(.4,.5), new Color(1,1,1,.5), this.velocity.angle());
        drawRect(this.pos, vec2(.2,.5), this.color, this.velocity.angle());
        //drawTile(this.pos, vec2(.2,.5), 0, undefined, this.color, this.velocity.angle());
    }
}

///////////////////////////////////////////////////////////////////////////////
// Super Laser Weapon for Player 2

class SuperLaserWeapon extends EngineObject 
{
    constructor(pos, parent) 
    { 
        super(pos, vec2(.8), 4, vec2(8));

        // weapon settings
        this.isWeapon = 1;
        this.fireTimeBuffer = this.localAngle = 0;
        this.recoilTimer = new Timer;

        this.addChild(this.shellEmitter = new ParticleEmitter(
            vec2(), 0, 0, 0, .1,  // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined, // tileIndex, tileSize
            new Color(0,.5,1), new Color(0,.8,1), // colorStartA, colorStartB (cyan/blue)
            new Color(0,.5,1), new Color(0,.8,1), // colorEndA, colorEndB
            3, .15, .15, .2, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            1, .95, 1, 0, 0,    // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .1, 1              // randomness, collide, additive, randomColorLinear, renderOrder
        ));
        this.shellEmitter.elasticity = .5;
        this.shellEmitter.particleDestroyCallback = persistentParticleDestroyCallback;
        this.renderOrder = parent.renderOrder+1;

        parent.weapon = this;
        parent.addChild(this, this.localOffset = vec2(.55,0));
    }

    update()
    {
        super.update();

        const fireRate = 6; // slower fire rate but more powerful
        const bulletSpeed = .6; // faster bullets
        const bulletRange = 12; // longer range
        const spread = .05; // more accurate

        this.mirror = this.parent.mirror;
        this.fireTimeBuffer += timeDelta;

        if (this.recoilTimer.isSet())
            this.localAngle = lerp(this.recoilTimer.getPercent(), 0, this.localAngle);

        if (this.triggerIsDown)
        {
            const speed = bulletSpeed * (this.parent.team == team_player ? 1 : .5);
            const rate = 1/fireRate;
            for(; this.fireTimeBuffer > 0; this.fireTimeBuffer -= rate)
            {
                this.localAngle = -rand(.25,.2);
                this.recoilTimer.set(rand(.5,.4));
                const bullet = new LaserBullet(this.pos, this.parent);
                const direction = vec2(this.getMirrorSign(speed), 0);
                bullet.velocity = direction.rotate(rand(spread,-spread));
                bullet.range = bulletRange;

                this.shellEmitter.localAngle = -.8*this.getMirrorSign();
                this.shellEmitter.emitParticle();

                playSound(sound_shoot, this.pos);

                // alert enemies
                this.parent.isPlayer && alertEnemies(this.pos, this.pos, 5);
            }
        }
        else
            this.fireTimeBuffer = min(this.fireTimeBuffer, 0);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Thick Laser Bullet for Super Laser Weapon

class LaserBullet extends EngineObject 
{
    constructor(pos, attacker) 
    { 
        super(pos, vec2(0));
        this.color = new Color(0,.8,1,1); // cyan/blue color
        this.lastVelocity = this.velocity;
        this.setCollision();

        this.damage = 2; // double damage
        this.damping = 1;
        this.gravityScale = 0;
        this.attacker = attacker;
        this.team = attacker.team;
    }

    update()
    {
        this.lastVelocity = this.velocity;
        super.update();

        this.range -= this.velocity.length();
        if (this.range < 0 )
        {
            const emitter = new ParticleEmitter(
                this.pos, .3, .1, 100, PI, // pos, emitSize, emitTime, emitRate, emiteCone
                0, undefined,     // tileIndex, tileSize
                new Color(0,.8,1,.5), new Color(0,1,1,.5), // colorStartA, colorStartB (cyan)
                new Color(0,.8,1,0), new Color(0,1,1,0), // colorEndA, colorEndB
                .15, .6, .15, .15, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
                1, 1, .5, PI, .1,  // damping, angleDamping, gravityScale, particleCone, fadeRate, 
                .5, 0, 1           // randomness, collide, additive, randomColorLinear, renderOrder
            );

            this.destroy();
            return;
        }

        // check if hit someone
        forEachObject(this.pos, this.size, (o)=>
        {
            if (o.isGameObject && !o.parent && o.team != this.team)
            if (!o.dodgeTimer || !o.dodgeTimer.active())
                this.collideWithObject(o)
        });
    }
    
    collideWithObject(o)
    {
        if (o.isGameObject)
        {
            if (o.blockProjectile && o.blockProjectile(this))
            {
                this.kill();
                return 1;
            }

            o.damage(this.damage, this);
            o.applyForce(this.velocity.scale(.15)); // stronger knockback
            if (o.isCharacter)
            {
                playSound(sound_walk, this.pos);
                this.destroy();
            }
            else
                this.kill();
        }
    
        return 1; 
    }

    collideWithTile(data, pos)
    {
        if (data <= 0)
            return 0;
            
        const destroyTileChance = data == tileType_glass ? 1 : data == tileType_dirt ? .4 : .1;
        rand() < destroyTileChance && destroyTile(pos);
        this.kill();

        return 1; 
    }

    kill()
    {
        if (this.destroyed)
            return;

        const emitter = new ParticleEmitter(
            this.pos, 0, .15, 100, .3, // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined,     // tileIndex, tileSize
            new Color(0,.8,1), new Color(0,1,1), // colorStartA, colorStartB (cyan)
            new Color(0,.8,1), new Color(0,1,1), // colorEndA, colorEndB
            .25, .3, 0, .15, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            1, 1, .5, PI, .1,  // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .5, 1, 1           // randomness, collide, additive, randomColorLinear, renderOrder
        );
        emitter.trailScale = 1;
        emitter.angle = this.lastVelocity.angle() + PI;

        this.destroy();
    }

    render()
    {
        // THICK laser beam - much bigger than normal bullets
        drawRect(this.pos, vec2(.8, 1.2), new Color(1,1,1,.6), this.velocity.angle()); // outer white glow
        drawRect(this.pos, vec2(.6, 1.0), new Color(0,.5,1,.8), this.velocity.angle()); // middle blue
        drawRect(this.pos, vec2(.3, .8), this.color, this.velocity.angle()); // inner cyan core
    }
}

///////////////////////////////////////////////////////////////////////////////
// Rocket Tracking Weapon for Player 1

class RocketWeapon extends EngineObject 
{
    constructor(pos, parent) 
    { 
        super(pos, vec2(.7), 4, vec2(8));

        // weapon settings
        this.isWeapon = 1;
        this.fireTimeBuffer = this.localAngle = 0;
        this.recoilTimer = new Timer;

        this.addChild(this.shellEmitter = new ParticleEmitter(
            vec2(), 0, 0, 0, .1,  // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined, // tileIndex, tileSize
            new Color(1,.5,0), new Color(1,.3,0), // colorStartA, colorStartB (orange)
            new Color(1,.5,0), new Color(1,.3,0), // colorEndA, colorEndB
            3, .12, .12, .18, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            1, .95, 1, 0, 0,    // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .1, 1              // randomness, collide, additive, randomColorLinear, renderOrder
        ));
        this.shellEmitter.elasticity = .5;
        this.shellEmitter.particleDestroyCallback = persistentParticleDestroyCallback;
        this.renderOrder = parent.renderOrder+1;

        parent.weapon = this;
        parent.addChild(this, this.localOffset = vec2(.55,0));
    }

    update()
    {
        super.update();

        const fireRate = 4; // slower fire rate for rockets
        const bulletSpeed = .3; // slower initial speed
        const bulletRange = 15; // longer range
        const spread = .08;

        this.mirror = this.parent.mirror;
        this.fireTimeBuffer += timeDelta;

        if (this.recoilTimer.isSet())
            this.localAngle = lerp(this.recoilTimer.getPercent(), 0, this.localAngle);

        if (this.triggerIsDown)
        {
            const speed = bulletSpeed;
            const rate = 1/fireRate;
            for(; this.fireTimeBuffer > 0; this.fireTimeBuffer -= rate)
            {
                this.localAngle = -rand(.3,.25);
                this.recoilTimer.set(rand(.6,.5));
                const bullet = new RocketBullet(this.pos, this.parent);
                const direction = vec2(this.getMirrorSign(speed), 0);
                bullet.velocity = direction.rotate(rand(spread,-spread));
                bullet.range = bulletRange;

                this.shellEmitter.localAngle = -.8*this.getMirrorSign();
                this.shellEmitter.emitParticle();

                playSound(sound_shoot, this.pos);

                // alert enemies
                this.parent.isPlayer && alertEnemies(this.pos, this.pos, 5);
            }
        }
        else
            this.fireTimeBuffer = min(this.fireTimeBuffer, 0);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Tracking Rocket Bullet

class RocketBullet extends EngineObject 
{
    constructor(pos, attacker) 
    { 
        super(pos, vec2(.3, .2));
        this.color = new Color(1,.3,0,1); // orange color
        this.lastVelocity = this.velocity;
        this.setCollision();

        this.damage = 3; // high damage
        this.damping = 1; // no damping - keep constant speed
        this.gravityScale = 0;
        this.attacker = attacker;
        this.team = attacker.team;
        this.target = null;
        this.trackingStrength = .003; // how strongly it tracks
        
        // Create smoke trail emitter
        this.addChild(this.trailEmitter = new ParticleEmitter(
            vec2(), 0, 0, 50, .1,  // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined, // tileIndex, tileSize
            new Color(1,.5,0,.5), new Color(1,.3,0,.3), // colorStartA, colorStartB (orange smoke)
            new Color(.5,.5,.5,0), new Color(.3,.3,.3,0), // colorEndA, colorEndB (gray fade)
            .4, .3, .6, .05, .1, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            .95, .9, 0, PI, .05,    // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .3, 0, 1              // randomness, collide, additive, randomColorLinear, renderOrder
        ));
        this.trailEmitter.renderOrder = -1;
    }

    update()
    {
        this.lastVelocity = this.velocity;
        
        // Find nearest enemy to track
        let nearestEnemy = null;
        let nearestDistSq = 100; // max tracking range squared
        
        forEachObject(this.pos, 10, (o) => {
            if (o.isCharacter && o.team != this.team && !o.isDead())
            {
                const distSq = this.pos.distanceSquared(o.pos);
                if (distSq < nearestDistSq)
                {
                    nearestDistSq = distSq;
                    nearestEnemy = o;
                }
            }
        });
        
        // Track the nearest enemy
        if (nearestEnemy)
        {
            const toTarget = nearestEnemy.pos.subtract(this.pos).normalize();
            const currentDir = this.velocity.normalize();
            const trackingForce = toTarget.subtract(currentDir).scale(this.trackingStrength);
            this.velocity = this.velocity.add(trackingForce).normalize(this.velocity.length());
        }
        
        // Emit smoke trail
        this.trailEmitter.emitParticle();
        
        super.update();

        this.range -= this.velocity.length();
        if (this.range < 0 )
        {
            this.explode();
            this.destroy();
            return;
        }

        // check if hit someone
        forEachObject(this.pos, this.size, (o)=>
        {
            if (o.isGameObject && !o.parent && o.team != this.team)
            if (!o.dodgeTimer || !o.dodgeTimer.active())
                this.collideWithObject(o)
        });
    }
    
    collideWithObject(o)
    {
        if (o.isGameObject)
        {
            if (o.blockProjectile && o.blockProjectile(this))
            {
                this.kill();
                return 1;
            }

            o.damage(this.damage, this);
            o.applyForce(this.velocity.scale(.2)); // strong knockback
            if (o.isCharacter)
            {
                playSound(sound_walk, this.pos);
                this.explode();
                this.destroy();
            }
            else
                this.kill();
        }
    
        return 1; 
    }

    collideWithTile(data, pos)
    {
        if (data <= 0)
            return 0;
            
        const destroyTileChance = data == tileType_glass ? 1 : data == tileType_dirt ? .6 : .2;
        rand() < destroyTileChance && destroyTile(pos);
        this.kill();

        return 1; 
    }

    kill()
    {
        if (this.destroyed)
            return;

        this.explode();
        this.destroy();
    }
    
    explode()
    {
        // trigger real game explosion (damage tiles/objects)
        explosion(this.pos, 3, this.team);

        // Big explosion effect
        const emitter = new ParticleEmitter(
            this.pos, .4, .2, 200, PI, // pos, emitSize, emitTime, emitRate, emiteCone
            undefined, undefined,     // tileIndex, tileSize
            new Color(1,1,0), new Color(1,.5,0), // colorStartA, colorStartB (yellow-orange)
            new Color(1,0,0), new Color(.5,0,0), // colorEndA, colorEndB (red)
            .3, .4, .1, .2, .15, // particleTime, sizeStart, sizeEnd, particleSpeed, particleAngleSpeed
            .9, .95, .3, PI, .1,  // damping, angleDamping, gravityScale, particleCone, fadeRate, 
            .5, 1, 1           // randomness, collide, additive, randomColorLinear, renderOrder
        );
        emitter.trailScale = 1;
    }

    render()
    {
        const angle = this.velocity.angle();
        // Rocket body with flame trail
        drawRect(this.pos, vec2(.6, .4), new Color(1,1,1,.7), angle); // white glow
        drawRect(this.pos, vec2(.5, .3), new Color(.8,.3,.1), angle); // orange body
        drawRect(this.pos.add(vec2(-.25,0).rotate(angle)), vec2(.3, .25), new Color(1,.5,0,.8), angle); // flame
        drawRect(this.pos.add(vec2(-.3,0).rotate(angle)), vec2(.2, .15), new Color(1,1,0,.6), angle); // bright flame core
    }
}