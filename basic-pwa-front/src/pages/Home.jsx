import Ad_1 from '../assets/ad_1.jpg'
import Ad_2 from '../assets/ad_2.jpg'
import Ad_3 from '../assets/ad_3.jpg'
import Ad_4 from '../assets/ad_4.png'

const Home = () => {
    return (
        <div className="home--section">
            <img src={Ad_1} alt="404" />
            <img src={Ad_2} alt="Home" />
            <img src={Ad_3} alt="Home" />
            <img src={Ad_4} alt="Home" />
        </div>
    )
}

export default Home