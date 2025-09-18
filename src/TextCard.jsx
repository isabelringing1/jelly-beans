import Text from "./Text.jsx";
import Input from "./Input.jsx";

const TextCard = (props) => {
  const { card, onButtonClicked, id, isCurrent, userParams, setUserParams } =
    props;

  var cn = "card";
  cn += isCurrent ? "" : " hidden";
  cn += card.style && card.style.includes("top") ? " top" : "";

  return (
    <div className={cn} id={id}>
      {card.title && <Text text={card.title} title={true} />}
      {card.texts &&
        card.texts.map((text, i) => {
          return <Text text={text} key={"text-" + i} />;
        })}

      {card.input && (
        <Input
          id={card.id}
          type={card.input}
          options={card.options}
          userParams={userParams}
          setUserParams={setUserParams}
          onButtonClicked={onButtonClicked}
          button={card.button}
        />
      )}

      {card.button && !card.input && (
        <div id="button-container">
          <button className="button" id="next-button" onClick={onButtonClicked}>
            {card.button}
          </button>
        </div>
      )}
      {!card.button && <div className="text-div arrows">{">>"}</div>}
    </div>
  );
};

export default TextCard;
