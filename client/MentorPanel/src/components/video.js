import React, { Component } from 'react';
import ReactPlayer from 'react-player'
import { useSelector } from 'react-redux';

import { idleUrl, videoUrl } from '../api/api'
import { setIdle } from '../redux/actions'

const IdleVideo = (width, isReady, onReady) => {
    const mentor = useSelector(state => state.mentors[state.cur_mentor])
    const src = mentor ? idleUrl(mentor) : ''

    return (
        <ReactPlayer
            className={`${isReady ? 'visible' : 'invisible'}`}
            url={src}
            onReady={onReady}
            width='100%'
            height={width * 0.5625}
            loop={true}
            playing={true}
            playsinline={true}
            webkit-playsinline='true'
            volume={0}
            muted
        />
    )
}

const ResponseVideo = (width, isReady, onReady, onEnded) => {
    const isIdle = useSelector(state => state.isIdle)
    const mentor = useSelector(state => state.mentors[state.cur_mentor])

    const isVideoVisible = !isIdle && isReady
    const src = mentor ? videoUrl(mentor) : ''

    return (
        <ReactPlayer
            className={`video ${isVideoVisible ? 'fadeIn' : 'fadeOut'}`}
            url={src}
            onEnded={onEnded}
            onReady={onReady}
            width='100%'
            height={width * 0.5625}
            loop={false}
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
            isIdleReady: false,
            isVideoReady: false,
        };
    }

    componentDidMount() {
        const width = Math.min(window.innerWidth, 640)
        this.setState({ width })
    }

    onIdleReady = () => {
        this.setState({
            isIdleReady: true,
        })
    }

    onVideoReady = () => {
        this.setState({
            isVideoReady: true,
        })
    }

    onVideoEnded = () => {
        this.props.dispatch(setIdle())
    }

    render() {
        return (
            <div id="video-container">
                <IdleVideo
                    width={this.state.width}
                    isReady={this.state.isIdleReady}
                    onReady={this.onIdleReady} />
                <ResponseVideo
                    width={this.state.width}
                    isReady={this.state.isVideoReady}
                    onReady={this.onVideoReady}
                    onEnded={this.onVideoEnded} />
            </div>
        );
    }
}

export default Video