import React from 'react';
import ReactPlayer from 'react-player'
import { useSelector, useDispatch } from 'react-redux';
import { Star, StarBorder } from '@material-ui/icons'

import { idleUrl, videoUrl } from '../api/api'
import { setIdle, faveMentor } from '../redux/actions'

const FaveButton = () => {
    const dispatch = useDispatch()
    const mentor = useSelector(state => state.current_mentor)
    const fave_mentor = useSelector(state => state.faved_mentor)

    const onClick = () => {
        dispatch(faveMentor(mentor))
    }

    return (
        fave_mentor === mentor ?
            <Star className='star-icon' onClick={onClick} style={{ color: 'yellow' }} /> :
            <StarBorder className='star-icon' onClick={onClick} style={{ color: 'grey' }} />
    )
}

const VideoPlayer = ({ width }) => {
    const dispatch = useDispatch()
    const isIdle = useSelector(state => state.isIdle)
    const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
    const src =
        mentor ?
            isIdle ? idleUrl(mentor) : videoUrl(mentor)
            : ''

    const onEnded = () => {
        dispatch(setIdle())
    }

    return (
        <ReactPlayer
            url={src}
            onEnded={onEnded}
            loop={isIdle}
            width={width}
            height={width * 0.895}
            controls={true}
            playing={true}
            playsinline={true}
            webkit-playsinline='true' />
    )
}

class Video extends React.Component {
    constructor(props) {
        super(props);
        this.state = { width: 0 };
    }

    componentDidMount() {
        const width = Math.min(window.innerWidth, 500)
        this.setState({ width })
    }

    render() {
        return (
            <div id='video-container' style={{ width: this.state.width }}>
                <VideoPlayer width={this.state.width} />
                <FaveButton />
            </div>
        )
    }
}

export default Video
