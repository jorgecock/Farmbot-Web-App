jest.mock("../../../devices/actions", () => ({ updateConfig: jest.fn() }));

import * as React from "react";
import {
  FbosDetails, colorFromTemp, colorFromThrottle, ThrottleType,
  BetaReleaseOptInButtonProps, BetaReleaseOptIn, reformatFwVersion,
  reformatFbosVersion,
} from "../fbos_details";
import { shallow, mount } from "enzyme";
import { bot } from "../../../__test_support__/fake_state/bot";
import { FbosDetailsProps } from "../interfaces";
import { fakeFbosConfig } from "../../../__test_support__/fake_state/resources";
import { fakeState } from "../../../__test_support__/fake_state";
import {
  buildResourceIndex, fakeDevice,
} from "../../../__test_support__/resource_index_builder";
import { fakeTimeSettings } from "../../../__test_support__/fake_time_settings";
import { updateConfig } from "../../../devices/actions";

describe("<FbosDetails/>", () => {
  const fakeConfig = fakeFbosConfig();
  const state = fakeState();
  state.resources = buildResourceIndex([fakeConfig]);

  const fakeProps = (): FbosDetailsProps => ({
    botInfoSettings: bot.hardware.informational_settings,
    dispatch: jest.fn(x => x(jest.fn(), () => state)),
    sourceFbosConfig: () => ({ value: true, consistent: true }),
    shouldDisplay: () => false,
    botToMqttLastSeen: 0,
    deviceAccount: fakeDevice(),
    timeSettings: fakeTimeSettings(),
  });

  it("renders", () => {
    const p = fakeProps();
    p.botInfoSettings.env = "fakeEnv";
    p.botInfoSettings.commit = "fakeCommit";
    p.botInfoSettings.target = "fakeTarget";
    p.botInfoSettings.node_name = "fakeName";
    p.botInfoSettings.firmware_version = "0.0.0.R.ramps";
    p.botInfoSettings.firmware_commit = "fakeFwCommit";
    p.botInfoSettings.soc_temp = 48.3;
    p.botInfoSettings.wifi_level = -49;
    p.botInfoSettings.uptime = 0;
    p.botInfoSettings.memory_usage = 0;
    p.botInfoSettings.disk_usage = 0;
    p.deviceAccount.body.id = 12345;
    p.deviceAccount.body.last_ota_checkup = "2018-01-11T20:20:38.362Z";
    p.deviceAccount.body.fbos_version = "1.0.0";
    p.sourceFbosConfig = () => ({ value: "ttyACM0", consistent: true });

    const wrapper = mount(<FbosDetails {...p} />);
    ["Environment", "fakeEnv",
      "Commit", "fakeComm",
      "Target", "fakeTarget",
      "Node name", "fakeName",
      "Version last seen", "1.0.0",
      "Device ID", "12345",
      "Firmware", "0.0.0 Arduino/RAMPS (Genesis v1.2)",
      "Firmware commit", "fakeFwCo",
      "Firmware code", "0.0.0.R.ramps",
      "Firmware path", "ttyACM0",
      "FAKETARGET CPU temperature", "48.3", "C",
      "WiFi strength", "-49dBm",
      "OS release channel",
      "Uptime", "0 seconds",
      "Memory usage", "0MB",
      "Disk usage", "0%",
      "Last checked for updates", "January",
    ]
      .map(string => expect(wrapper.text()).toContain(string));
  });

  it("simplifies node name", () => {
    const p = fakeProps();
    p.botInfoSettings.node_name = "name@nodeName";
    const wrapper = shallow(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("nodeName");
    expect(wrapper.text()).not.toContain("name@");
  });

  it("handles missing data", () => {
    const p = fakeProps();
    p.sourceFbosConfig = () => ({ value: undefined, consistent: true });
    p.botInfoSettings.firmware_version = undefined;
    p.botInfoSettings.node_name = "";
    p.botInfoSettings.commit = "";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("---");
  });

  it("handles unknown firmware version", () => {
    const p = fakeProps();
    p.botInfoSettings.firmware_version = "0.0.0.S.S";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("0.0.0");
  });

  it("displays firmware commit link from firmware_commit", () => {
    const p = fakeProps();
    const commit = "abcdefgh";
    p.botInfoSettings.firmware_commit = commit;
    p.botInfoSettings.firmware_version = "1.0.0";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.find("a").last().text()).toEqual(commit);
    expect(wrapper.find("a").last().props().href?.split("/").slice(-1)[0])
      .toEqual(commit);
  });

  it("displays firmware commit link from version", () => {
    const p = fakeProps();
    const commit = "abcdefgh";
    p.botInfoSettings.firmware_version = `1.2.3.R.x-${commit}+`;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.find("a").last().text()).toEqual(commit);
    expect(wrapper.find("a").last().props().href?.split("/").slice(-1)[0])
      .toEqual(commit);
  });

  it("displays commit link", () => {
    const p = fakeProps();
    p.botInfoSettings.commit = "abcdefgh";
    p.botInfoSettings.firmware_commit = "abcdefgh";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.find("a").length).toEqual(2);
  });

  it("doesn't display link without commit", () => {
    const p = fakeProps();
    p.botInfoSettings.firmware_version = undefined;
    p.botInfoSettings.commit = "---";
    p.botInfoSettings.firmware_commit = "---";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.find("a").length).toEqual(0);
  });

  it("displays N/A when wifi strength value is undefined", () => {
    const p = fakeProps();
    p.botInfoSettings.wifi_level = undefined;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("WiFi strength: N/A");
    expect(wrapper.text()).not.toContain("dBm");
  });

  it.each<[number, string]>([
    [10, "gray"],
    [50, "red"],
    [70, "yellow"],
    [90, "green"],
  ])("displays correct wifi signal strength indicator color: %s %s",
    (percent, color) => {
      const p = fakeProps();
      p.botInfoSettings.wifi_level_percent = percent;
      const wrapper = mount(<FbosDetails {...p} />);
      expect(wrapper.find(".percent-bar-fill").hasClass(color)).toBeTruthy();
    });

  it("displays unknown when cpu temp value is undefined", () => {
    const p = fakeProps();
    p.botInfoSettings.soc_temp = undefined;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("CPU temperature: unknown");
    expect(wrapper.text()).not.toContain("&deg;C");
  });

  it("doesn't display extra metrics when bot is offline", () => {
    const p = fakeProps();
    p.botInfoSettings.uptime = undefined;
    p.botInfoSettings.memory_usage = undefined;
    p.botInfoSettings.disk_usage = undefined;
    const wrapper = mount(<FbosDetails {...p} />);
    ["uptime", "usage"].map(metric =>
      expect(wrapper.text().toLowerCase()).not.toContain(metric));
  });

  it("displays uptime in minutes", () => {
    const p = fakeProps();
    p.botInfoSettings.uptime = 120;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("2 minutes");
  });

  it("displays uptime in hours", () => {
    const p = fakeProps();
    p.botInfoSettings.uptime = 7200;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("2 hours");
  });

  it("displays uptime in days", () => {
    const p = fakeProps();
    p.botInfoSettings.uptime = 172800;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text()).toContain("2 days");
  });

  it("doesn't display when throttled value is undefined", () => {
    const p = fakeProps();
    p.botInfoSettings.throttled = undefined;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text().toLowerCase()).not.toContain("voltage");
  });

  it("displays voltage indicator", () => {
    const p = fakeProps();
    p.botInfoSettings.throttled = "0x0";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text().toLowerCase()).toContain("voltage");
  });

  it("displays cpu usage", () => {
    const p = fakeProps();
    p.botInfoSettings.cpu_usage = 10;
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text().toLowerCase()).toContain("cpu usage: 10%");
  });

  it("displays ip address", () => {
    const p = fakeProps();
    p.botInfoSettings.private_ip = "192.168.0.100";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text().toLowerCase()).toContain("ip address");
  });

  it("displays last OTA check date", () => {
    const p = fakeProps();
    p.deviceAccount.body.last_ota_checkup = "2018-01-11T20:20:38.362Z";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text().toLowerCase())
      .toContain("last checked for updates: january");
  });

  it("displays last OTA date", () => {
    const p = fakeProps();
    p.deviceAccount.body.last_ota = "2018-02-11T20:20:38.362Z";
    const wrapper = mount(<FbosDetails {...p} />);
    expect(wrapper.text().toLowerCase()).toContain("last updated: february");
  });
});

describe("<BetaReleaseOptIn />", () => {
  const fakeProps = (): BetaReleaseOptInButtonProps => ({
    dispatch: jest.fn(),
    sourceFbosConfig: () => ({ value: true, consistent: true }),
  });

  it("changes to beta channel", () => {
    const p = fakeProps();
    p.sourceFbosConfig = () => ({ value: "stable", consistent: true });
    const wrapper = shallow(<BetaReleaseOptIn {...p} />);
    window.confirm = jest.fn();
    wrapper.find("FBSelect").simulate("change", { label: "", value: "" });
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("you sure?"));
    expect(updateConfig).not.toHaveBeenCalled();
    window.confirm = () => true;
    wrapper.find("FBSelect").simulate("change", { label: "", value: "beta" });
    expect(updateConfig).toHaveBeenCalledWith({ update_channel: "beta" });
  });

  it("changes to stable channel", () => {
    const p = fakeProps();
    p.sourceFbosConfig = () => ({ value: "beta", consistent: true });
    const wrapper = shallow(<BetaReleaseOptIn {...p} />);
    window.confirm = () => false;
    wrapper.find("FBSelect").simulate("change", { label: "", value: "stable" });
    expect(updateConfig).toHaveBeenCalledWith({ update_channel: "stable" });
  });
});

describe("colorFromTemp()", () => {
  it("temperature is good or none", () => {
    expect(colorFromTemp(30)).toEqual("green");
    expect(colorFromTemp(undefined)).toEqual("gray");
  });
  it("temperature is hot", () => {
    expect(colorFromTemp(61)).toEqual("yellow");
    expect(colorFromTemp(76)).toEqual("red");
  });
  it("temperature is cold", () => {
    expect(colorFromTemp(9)).toEqual("blue");
    expect(colorFromTemp(-1)).toEqual("lightblue");
  });
});

describe("colorFromThrottle()", () => {
  it("is currently throttled", () => {
    expect(colorFromThrottle("0x40004", ThrottleType.Throttled)).toEqual("red");
  });
  it("was throttled", () => {
    expect(colorFromThrottle("0x40000", ThrottleType.Throttled)).toEqual("yellow");
  });
  it("hasn't been throttled", () => {
    expect(colorFromThrottle("0x0", ThrottleType.Throttled)).toEqual("green");
  });
});

describe("reformatFwVersion()", () => {
  it("returns version string", () => {
    expect(reformatFwVersion("1.0.0.R"))
      .toEqual("v1.0.0 Arduino/RAMPS (Genesis v1.2)");
    expect(reformatFwVersion("1.0.0.F.x"))
      .toEqual("v1.0.0 Farmduino (Genesis v1.3)");
  });

  it("returns null version string", () => {
    expect(reformatFwVersion(undefined)).toEqual("---");
    expect(reformatFwVersion("---")).toEqual("--- ");
  });
});

describe("reformatFbosVersion()", () => {
  it("returns version string", () => {
    expect(reformatFbosVersion("1.0.0-rc1")).toEqual("v1.0.0-rc1");
  });

  it("returns null version string", () => {
    expect(reformatFbosVersion(undefined)).toEqual("unknown");
  });
});
