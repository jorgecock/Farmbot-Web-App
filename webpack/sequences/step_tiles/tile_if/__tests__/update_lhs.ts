import {
  buildResourceIndex
} from "../../../../__test_support__/resource_index_builder";
import {
  SpecialStatus,
  isTaggedSequence,
  TaggedSequence,
  TaggedPeripheral
} from "../../../../resources/tagged_resources";
import {
  findAll,
  selectAllSequences,
  selectAllPeripherals
} from "../../../../resources/selectors";
import { updateLhs } from "../update_lhs";
import { If } from "farmbot";
import { PinGroupName } from "../../pin_and_peripheral_support";
import { Actions } from "../../../../constants";
import { get } from "lodash";

describe("updateLhs", () => {
  const seedSequence: TaggedSequence = {
    kind: "Sequence",
    specialStatus: SpecialStatus.SAVED,
    uuid: "===",
    body: {
      id: 1,
      color: "red",
      name: "test",
      kind: "sequence",
      args: {
        locals: { kind: "scope_declaration", args: {} },
        version: 9999
      },
      body: [
        {
          kind: "_if",
          args: {
            lhs: "pin0",
            op: "==",
            rhs: 0,
            _then: { kind: "nothing", args: {} },
            _else: { kind: "nothing", args: {} },
          }
        }
      ]
    }
  };

  const peripheral: TaggedPeripheral = {
    kind: "Peripheral",
    uuid: "---",
    specialStatus: SpecialStatus.SAVED,
    body: { id: 1, pin: 13, label: "My perihperal" }
  };

  const resources = buildResourceIndex([seedSequence, peripheral]);
  const currentSequence = selectAllSequences(resources.index)[0];
  const currentStep = (currentSequence.body.body || [])[0] as If;
  const index = 0;
  /** The mock information is nested so deep :-\ */
  const path = "mock.calls[0][0].payload.update.body[0].args.lhs";

  it("handles sensors", () => {
    const dispatch = jest.fn();
    const props = {
      currentStep,
      currentSequence,
      dispatch,
      index,
      resources: resources.index
    };
    const fn = updateLhs(props);
    fn({
      value: selectAllPeripherals(resources.index)[0].uuid,
      label: "Click me!",
      headingId: PinGroupName.Sensor
    });
    expect(dispatch).toHaveBeenCalled();
    const expectedType =
      expect.objectContaining({ type: Actions.OVERWRITE_RESOURCE });
    expect(dispatch).toHaveBeenCalledWith(expectedType);
    expect(get(dispatch, path + ".args.pin_type")).toEqual("Peripheral");
    expect(get(dispatch, path + ".args.pin_id")).toEqual(peripheral.body.id);
  });

  it("Handles positions / pins", () => {
    const dispatch = jest.fn();
    const props = {
      currentStep,
      currentSequence,
      dispatch,
      index,
      resources: resources.index
    };
    const fn = updateLhs(props);
    fn({ value: "pin5", label: "Click me!", headingId: PinGroupName.Pin });
    expect(dispatch).toHaveBeenCalled();
    const expectedType =
      expect.objectContaining({ type: Actions.OVERWRITE_RESOURCE });
    expect(dispatch).toHaveBeenCalledWith(expectedType);
    expect(get(dispatch, path)).toEqual("pin5");
  });

  it("handles malformeed data", () => {
    const dispatch = jest.fn();
    const props = {
      currentStep,
      currentSequence,
      dispatch,
      index,
      resources: resources.index
    };
    const fn = updateLhs(props);
    // Bad headingId:
    expect(() => fn({ value: "pin5", label: "Click me!", headingId: "Wrong" }))
      .toThrowError();
    expect(() => fn({
      value: "X",
      label: "Y",
      headingId: PinGroupName.Peripheral
    })).toThrowError();
  });
});
