import React, { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Accelerometer } from "expo-sensors"

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window")

const PLAYER_W = 50
const PLAYER_H = 50
const PLAYER_BOTTOM_PADDING = 20

const BULLET_W = 8
const BULLET_H = 16
const BULLET_SPEED = 700

const ENEMY_W = 40
const ENEMY_H = 40
const ENEMY_SPEED = 180

const FIRE_COOLDOWN = 50

const WAVES = [
  { count: 4, speedMul: 1 },
  { count: 5, speedMul: 1.05 },
  { count: 6, speedMul: 1.1 },
  { count: 7, speedMul: 1.12 },
  { count: 8, speedMul: 1.2 },
  { count: 9, speedMul: 1.25 },
  { count: 10, speedMul: 1.3 },
  { count: 11, speedMul: 1.35 },
  { count: 12, speedMul: 1.45 },
  { count: 14, speedMul: 1.6 },
]



export default function App() {
  const [playerX, setPlayerX] = useState((SCREEN_W - PLAYER_W) / 2)
  const playerXRef = useRef(playerX)



  const [bullets, setBullets] = useState([])
  const bulletsRef = useRef([])


  const [enemies, setEnemies] = useState([])
  const enemiesRef = useRef([])



  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(10)
  const [waveIndex, setWaveIndex] = useState(0)
  const [gameState, setGameState] = useState("playing")

  const canFireRef = useRef(true)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)

  const makeId = (p = "") =>
    p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

  useEffect(() => {
    playerXRef.current = playerX
  }, [playerX])





  useEffect(() => {
    Accelerometer.setUpdateInterval(16)
    const sub = Accelerometer.addListener(({ x }) => {
      setPlayerX(prev => {
        let next = prev + (-x) * 50
        if (next < 0) next = 0
        if (next > SCREEN_W - PLAYER_W) next = SCREEN_W - PLAYER_W
        return next
      })
    })
    return () => sub.remove()
  }, [])



  const spawnWave = (idx) => {
    const wave = WAVES[Math.min(idx, WAVES.length - 1)]
    const count = wave.count


    const rows = count > 8 ? 2 : 1
    const perRow = Math.ceil(count / rows)

    const newEnemies = []

    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < perRow; i++) {
        const gi = r * perRow + i


        if (gi >= count) break

        const spacing = SCREEN_W / (perRow + 1)
        const x = Math.max(
          0,
          Math.min(SCREEN_W - ENEMY_W, i * spacing + spacing - ENEMY_W / 2)
        )
        const y = -ENEMY_H - 20 - r * (ENEMY_H + 12)




        newEnemies.push({
          id: makeId("e_"),
          x,
          y,
          w: ENEMY_W,
          h: ENEMY_H,
          hp: 1,
          type: "normal",
          color: ["#ffd166", "#06d6a0", "#118ab2", "#ef476f"][gi % 4],
          speed: ENEMY_SPEED * wave.speedMul,
        })
      }
    }



    enemiesRef.current = newEnemies
    setEnemies([...enemiesRef.current])

    bulletsRef.current = []
    setBullets([])
  }




  useEffect(() => {
    spawnWave(0)
  }, [])

  const rectOverlap = (a, b) => {
    return !(
      a.x + a.w < b.x ||
      a.x > b.x + b.w ||
      a.y + a.h < b.y ||
      a.y > b.y + b.h
    )
  }



  const fireBullet = () => {
    if (gameState !== "playing") return
    if (!canFireRef.current) return



    canFireRef.current = false
    setTimeout(() => {
      canFireRef.current = true
    }, FIRE_COOLDOWN)




    const playerTop = SCREEN_H - PLAYER_BOTTOM_PADDING - PLAYER_H
    const bulletX = playerXRef.current + (PLAYER_W - BULLET_W) / 2
    const bulletY = playerTop - BULLET_H


    const b = {
      id: Date.now().toString(),
      x: bulletX,
      y: bulletY,
      w: BULLET_W,
      h: BULLET_H,
    }



    bulletsRef.current = [...bulletsRef.current, b]
    setBullets([...bulletsRef.current])
  }

  const restart = () => {
    setScore(0)
    setLives(3)
    setWaveIndex(0)
    setGameState("playing")
    spawnWave(0)
    lastTimeRef.current = null
  }

  useEffect(() => {
    const loop = (time) => {
      if (gameState !== "playing") {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        return
      }

      if (!lastTimeRef.current) lastTimeRef.current = time
      const dtMs = Math.min(50, time - lastTimeRef.current)
      const dt = dtMs / 1000
      lastTimeRef.current = time

      if (bulletsRef.current.length > 0) {
        bulletsRef.current = bulletsRef.current
          .map(b => ({ ...b, y: b.y - BULLET_SPEED * dt }))
          .filter(b => b.y + b.h > -50)
      }


      if (enemiesRef.current.length > 0) {
        enemiesRef.current = enemiesRef.current
          .map(e => ({ ...e, y: e.y + (e.speed || ENEMY_SPEED) * dt }))
          .filter(e => e.y < SCREEN_H + 200)
      }

      const newBullets = []
      const newEnemies = enemiesRef.current.map(e => ({ ...e }))

      for (let bi = 0; bi < bulletsRef.current.length; bi++) {
        const b = bulletsRef.current[bi]
        let hit = false

        for (let ei = newEnemies.length - 1; ei >= 0; ei--) {
          const en = newEnemies[ei]
          if (rectOverlap(b, en)) {
            hit = true
            en.hp = (typeof en.hp === "number" ? en.hp : 1) - 1
            if (en.hp <= 0) {
              newEnemies.splice(ei, 1)

              setScore(s => s + 100)
            } else {
              setScore(s => s + 25)


            }
            break


          }
        }

        if (!hit) newBullets.push(b)
      }

      const playerTop = SCREEN_H - PLAYER_BOTTOM_PADDING - PLAYER_H



      const playerRect = {
        x: playerXRef.current,
        y: playerTop,
        w: PLAYER_W,
        h: PLAYER_H,
      }

      for (let i = newEnemies.length - 1; i >= 0; i--) {
        const en = newEnemies[i]

        if (en.y + en.h >= playerTop || rectOverlap(en, playerRect)) {
          newEnemies.splice(i, 1)
          setLives(lv => {
            const nl = lv - 1
            if (nl <= 0) setGameState("over")

            return nl
          })
        }
      }

      enemiesRef.current = newEnemies
      bulletsRef.current = newBullets

      setEnemies([...enemiesRef.current])
      setBullets([...bulletsRef.current])

      const remaining = enemiesRef.current.filter(e => e.type !== "enemyBullet" && e.type !== "bossBullet")


      if (remaining.length === 0) {


        const next = waveIndex + 1

        if (waveIndex < WAVES.length - 1) {
          setWaveIndex(next)
          spawnWave(next)


        } else {
          const bossW = Math.round(ENEMY_W * 1.8)
          const bossH = Math.round(ENEMY_H * 1.8)


          enemiesRef.current = [
            {
              id: makeId("boss_"),
              x: (SCREEN_W - bossW) / 2,
              y: -bossH - 40,
              w: bossW,
              h: bossH,
              hp: 40 + Math.floor(score / 500),
              type: "boss",
              color: "#9b5de5",
              speed: 40,
            },


          ]

          setEnemies([...enemiesRef.current])
          setWaveIndex(next)
        }
      }



      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimeRef.current = null



    }
  }, [gameState, waveIndex])

  const waveDisplay = () => {
    if (waveIndex > WAVES.length - 1)
      return `${Math.min(waveIndex + 1, WAVES.length + 1)} (BOSS)`
    return `${Math.min(waveIndex + 1, WAVES.length)}/${WAVES.length}`
  }

  return (
    <TouchableWithoutFeedback onPress={fireBullet}>





      <View style={styles.container}>
        {enemies.map(e => (
          <View
            key={e.id}
            style={[
              styles.enemy,
              {
                left: Math.round(e.x),
                top: Math.round(e.y),
                width: e.w,
                height: e.h,
                borderRadius: Math.max(e.w, e.h) / 2,
                backgroundColor: e.color || "#fff",
              },
            ]}
          />
        ))}

        {bullets.map(b => (
          <View
            key={b.id}
            style={[
              styles.bullet,
              {
                left: Math.round(b.x),
                top: Math.round(b.y),
                width: b.w,
                height: b.h,
              },
            ]}
          />
        ))}

        <View style={[styles.player, { left: playerX }]} />

        <View style={styles.hud}>
          <Text style={styles.hudText}>Score: {score}</Text>
          <Text style={styles.hudText}>Lives: {lives}</Text>
          <Text style={styles.hudText}>Wave: {waveDisplay()}</Text>
        </View>

        {gameState === "over" && (
          <View style={styles.overlay}>
            <Text style={styles.gameOverText}>
              {lives <= 0 ? "Game Over" : "You Win!"}
            </Text>
            <TouchableOpacity onPress={restart} style={styles.restartBtn}>
              <Text style={styles.restartText}>Restart</Text>
            </TouchableOpacity>
          </View>
        )}

        <StatusBar style="auto" />
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  player: {
    position: "absolute",
    bottom: PLAYER_BOTTOM_PADDING,
    width: PLAYER_W,
    height: PLAYER_H,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
  },
  bullet: {
    position: "absolute",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
  },
  enemy: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  hud: { position: "absolute", top: 30, left: 12 },
  hudText: { color: "#fff", fontFamily: "Courier", marginBottom: 4 },
  overlay: {
    position: "absolute",
    top: SCREEN_H / 2 - 80,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  gameOverText: { color: "#fff", fontSize: 24, fontWeight: "bold", fontFamily: "Courier" },
  restartBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  restartText: { color: "#000", fontWeight: "600" },
  instruction: {
    position: "absolute",
    top: 70,
    color: "#fff",
    fontFamily: "Courier",
    fontSize: 14,
    alignSelf: "center",
  },
})
