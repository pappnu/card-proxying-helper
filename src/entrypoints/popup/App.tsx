import { browser } from "#imports";
import { cardNameTemplatesStorage } from "@/utils/storage";
import { useEffect, useState } from "react";

const cardNameTemplateInputId = "cardNameTemplateInput";

export function App() {
  const [cardNameTemplates, setCardNameTemplates] = useState<string[]>([]);

  const setAndNotifyCardNameTemplates = (
    setStateAction: (prevSate: string[]) => string[],
  ) => {
    setCardNameTemplates((prevState) => {
      const newState = setStateAction(prevState);
      cardNameTemplatesStorage.setValue(newState);
      browser.runtime.sendMessage({
        purpose: "cardNameTemplates",
        templates: newState,
      });
      return newState;
    });
  };

  useEffect(() => {
    cardNameTemplatesStorage
      .getValue()
      .then((templates) => setCardNameTemplates(templates));
  }, []);

  return (
    <div className="popup__container">
      <div className="popup__title-container">
        <h2 className="popup__card-template-input-header">
          Card Name Templates
        </h2>
        <button
          className="popup__icon-button"
          onClick={() =>
            setAndNotifyCardNameTemplates((prevState) => [...prevState, ""])
          }
        >
          +
        </button>
      </div>
      <p className="popup__card-template-input-text">
        Context variables wrapped in double curly braces{" "}
        <span className="popup__card-template-input-text--monospace">
          {"{{}}"}
        </span>{" "}
        are replaced with their respective values. Supported variables are:
        <br />
        <span className="popup__card-template-input-text--monospace">
          name, artist, set, collectorNumber, clipboard
        </span>
      </p>
      {cardNameTemplates.map((template, idx) => (
        <div key={idx} className="popup__card-template-input-container">
          <input
            id={cardNameTemplateInputId}
            className="popup__card-template-input"
            type="text"
            value={template}
            onChange={(evt) => {
              setAndNotifyCardNameTemplates((prevState) => {
                const newState = [...prevState];
                newState[idx] = evt.target.value;
                return newState;
              });
            }}
          />
          <button
            className="popup__icon-button"
            onClick={() =>
              setAndNotifyCardNameTemplates((prevState) => {
                const newState = [...prevState];
                newState.splice(idx, 1);
                return newState;
              })
            }
          >
            –
          </button>
        </div>
      ))}
    </div>
  );
}
