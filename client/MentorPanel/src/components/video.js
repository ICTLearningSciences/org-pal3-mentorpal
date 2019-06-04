import React, { Component } from 'react';
import ReactPlayer from 'react-player'
import { useSelector, useDispatch } from 'react-redux';

import { idleUrl, videoUrl } from '../api/api'
import { setIdle } from '../redux/actions'

const ResponseVideo = ({ width }) => {
    const dispatch = useDispatch()
    const isIdle = useSelector(state => state.isIdle)
    const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
    var src = mentor ?
        isIdle ? idleUrl(mentor) : videoUrl(mentor)
        : ''

    const onEnded = () => {
        dispatch(setIdle())
    }

    return (
        <ReactPlayer
            className='video'
            url={src}
            onEnded={onEnded}
            width='100%'
            height={width * 0.5625}
            loop={isIdle}
            controls={true}
            playing={true}
            playsinline={true}
            webkit-playsinline='true' />
    )
}

class Video extends Component {
    constructor(props) {
        super(props);
        this.state = {
            width: 0,
        };
    }

    componentDidMount() {
        const width = Math.min(window.innerWidth, 640)
        this.setState({ width })
    }

    render() {
        return (
            <div id="video-container">
                <ResponseVideo width={this.state.width} />
            </div>
        );
    }
}

export default Video
