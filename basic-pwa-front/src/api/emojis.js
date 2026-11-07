


async function get_emojis_list(){
    const data = await fetch('https://api.github.com/emojis')
    if (data === null) {
        return null
    }
    const emojis = await data.json()
    return emojis
}

export default get_emojis_list;