export const makeLinksClickable = (text: string) => {
  return text.split(/(\bhttps?:\/\/\S+\b)/g).map((part, index) =>
    part.match(/\bhttps?:\/\/\S+\b/) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-300 underline underline-offset-1"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
};
