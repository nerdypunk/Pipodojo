import { describe, expect, it } from "vitest";
import { DEFAULT_SOUND, parseSoundSettings } from "../src/app/sound.ts";

describe("sound settings", () => {
  it("are on by default", () => {
    expect(DEFAULT_SOUND).toEqual({ music: true, sfx: true });
    expect(parseSoundSettings(null)).toEqual({ music: true, sfx: true });
    expect(parseSoundSettings("junk")).toEqual({ music: true, sfx: true });
  });

  it("keep what the player turned off", () => {
    expect(parseSoundSettings({ music: false, sfx: true })).toEqual({ music: false, sfx: true });
    expect(parseSoundSettings({ music: true, sfx: false })).toEqual({ music: true, sfx: false });
  });
});
