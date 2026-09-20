import assert from "node:assert/strict"
import test from "node:test"
import { parseMpdStatus, trackPosition } from "../services/mpd-state.ts"

test("MPD status keeps metadata and parses paused and hour-long positions", () => {
  const status = parseMpdStatus(
    "Artist\tTitle\tAlbum\tdir/song.flac\t1:30:00\n[paused] #2/4  1:02:03/1:30:00 (69%)\nvolume:100%",
  )
  assert.deepEqual(status, {
    artist: "Artist",
    title: "Title",
    album: "Album",
    file: "dir/song.flac",
    state: "paused",
    elapsed: 3723,
    duration: 5400,
  })
})

test("untagged tracks use their filename and streams may have no duration", () => {
  const status = parseMpdStatus("\t\t\tdir/song.flac\t\n[playing] #1/1 0:12/0:00 (0%)")
  assert.equal(status.title, "song.flac")
  assert.equal(status.state, "playing")
  assert.equal(status.duration, 0)
  assert.equal(status.elapsed, 12)
})

test("elapsed time advances streams and clamps only tracks with a known duration", () => {
  const stream = parseMpdStatus("\t\t\tstream\t\n[playing] #1/1 0:12/0:00 (0%)")
  assert.equal(trackPosition(stream, 5), 17)
  assert.equal(trackPosition(stream, -5), 12)
  assert.equal(trackPosition({ ...stream, state: "paused" }, 5), 12)
  assert.equal(trackPosition({ ...stream, duration: 15 }, 5), 15)
})

test("an empty or stopped queue cannot retain the previous track or seek position", () => {
  for (const output of ["", "volume:100%   repeat: off   random: off"]) {
    const status = parseMpdStatus(output)
    assert.equal(status.file, "")
    assert.equal(status.state, "stopped")
    assert.equal(status.elapsed, 0)
    assert.equal(status.duration, 0)
  }
})
