


const EmojisListItem = ({emojiName, emojiUrl}) => {
    return (
        <li className="emojis--list--item" key={emojiName}>
            <div className="emojis--list--item--image">
                <img src={emojiUrl} alt="emoji image" width="32px" height="32px" loading='lazy' />
            </div>
            {emojiName}
        </li>
    )
}

export default EmojisListItem
