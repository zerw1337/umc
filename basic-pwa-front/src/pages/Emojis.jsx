import EmojisListItem from "../components/EmojisListItem.jsx"
import {useState, useEffect} from "react";

import getEmojisList from '../api/emojis.js'

const Emojis = () => {

    const [emojisList, setEmojisList] = useState([])

    useEffect(() => {
        getEmojisList().then(data => {
            setEmojisList(Object.entries(data))
        })
    }, [])

    return (
        <div className="emojis--list">
            {emojisList.map(([name, url]) => (
                <EmojisListItem emojiName={name} emojiUrl={url} />
            ))}
        </div>
    )
}

export default Emojis;