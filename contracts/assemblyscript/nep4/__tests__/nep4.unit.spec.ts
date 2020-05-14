import {
  showYouKnow,
  sayHello,
  sayMyName,
  saveMyName,
  saveMyMessage,
  getAllMessages,
} from "../main";
import { storage, PersistentDeque, Context, VM } from "near-sdk-as";

const contract = "greeting";
const alice = "alice";
const bob = "bob";
const carol = "carol";
const message1 = "awesomesauce!";
const message2 = "yashilsin!";
const message3 = "beleza!";

let messages: PersistentDeque<string>;

describe("01. Greeting", () => {
  beforeEach(() => {
    Context.setCurrent_account_id(contract);
    Context.setSigner_account_id(alice);
    messages = new PersistentDeque<string>("messages");
  });

  it("should respond to showYouKnow()", () => {
    showYouKnow();
    expect(showYouKnow).not.toThrow();
    expect(VM.logs()).toContainEqual("showYouKnow() was called");
  });

  it("should respond to sayHello()", () => {
    expect(sayHello()).toStrictEqual("Hello!");
    expect(VM.logs()).toContainEqual("sayHello() was called");
  });

  it("should respond to sayMyName()", () => {
    expect(sayMyName()).toStrictEqual("Hello, " + alice + "!");
    expect(VM.logs()).toContainEqual("sayMyName() was called");
  });

  it("should respond to saveMyName()", () => {
    expect(saveMyName).not.toThrow();
    expect(storage.getString("sender")).toStrictEqual(alice);
    expect(VM.logs()).toContainEqual("saveMyName() was called");

    // as-pect requires that we restore contract state between tests in the same file
    storage.delete("sender");
  });

  it("should respond to saveMyMessage()", () => {
    const expected = alice + " says " + message1;
    expect(saveMyMessage(message1)).toBeTruthy();
    expect(messages.first).toStrictEqual(expected);
    expect(VM.logs()).toContainEqual("saveMyMessage() was called");

    // as-pect requires that we restore contract state between tests in the same file
    messages.popFront();
  });

  it("should respond to getAllMessages()", () => {
    messages.pushFront(message1);
    messages.pushFront(message2);
    messages.pushFront(message3);

    const output = getAllMessages();
    expect(output).toHaveLength(3);
    expect(messages).toHaveLength(0);

    expect(VM.logs()).toContainEqual("getAllMessages() was called");

    // as-pect requires that we restore contract state between tests in the same file
    while (!messages.isEmpty) {
      messages.popBack();
    }
  });
});
