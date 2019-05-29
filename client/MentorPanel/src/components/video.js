import React, { Component } from 'react';
import ReactPlayer from 'react-player'
import { connect } from 'react-redux';

import { idleUrl, videoUrl } from '../funcs/funcs'
import { setIdle } from '../redux/actions'

class Video extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isIdleReady: false,
            isVideoReady: false,
        };
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

    renderIdle() {
        const node = document.getElementById('video-container');
        if (!node) {
            return
        }
        const width = Math.min(window.innerWidth, video_width)
        const src = this.props.mentor ? idleUrl(this.props.mentor) : ''

        return (
            <ReactPlayer
                className={`${this.state.isIdleReady ? 'visible' : 'invisible'}`}
                url={src}
                onReady={this.onIdleReady}
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

    render() {
        const isVideoVisible = !this.props.isIdle && this.state.isVideoReady
        const width = Math.min(window.innerWidth, video_width)
        const src = this.props.mentor ? videoUrl(this.props.mentor) : ''

        const video =
            <ReactPlayer
                className={`video ${isVideoVisible ? 'fadeIn' : 'fadeOut'}`}
                url={src}
                onEnded={this.onVideoEnded}
                onReady={this.onVideoReady}
                width='100%'
                height={width * 0.5625}
                loop={false}
                controls={true}
                playing={true}
                playsinline={true}
                webkit-playsinline='true' />

        return (
            <div id="video-container">
                {this.renderIdle()}
                {video}
            </div>
        );
    }
}

const video_width = 640

const mapStateToProps = state => {
    const mentor = state.mentors.find(m => { return m.id === state.mentor })
    return {
        mentor: mentor,
        isIdle: state.isIdle,
    }
}

export default connect(mapStateToProps)(Video);