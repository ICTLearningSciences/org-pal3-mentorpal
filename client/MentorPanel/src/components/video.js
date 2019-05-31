import React, { Component } from 'react';
import ReactPlayer from 'react-player'
import { connect } from 'react-redux';

import { idleUrl, videoUrl } from '../api/api'
import { setIdle } from '../redux/actions'

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

    renderIdle() {
        const src = this.props.mentor ? idleUrl(this.props.mentor) : ''

        return (
            <ReactPlayer
                className={`${this.state.isIdleReady ? 'visible' : 'invisible'}`}
                url={src}
                onReady={this.onIdleReady}
                width='100%'
                height={this.state.width * 0.5625}
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
        const src = this.props.mentor ? videoUrl(this.props.mentor) : ''

        const video =
            <ReactPlayer
                className={`video ${isVideoVisible ? 'fadeIn' : 'fadeOut'}`}
                url={src}
                onEnded={this.onVideoEnded}
                onReady={this.onVideoReady}
                width='100%'
                height={this.state.width * 0.5625}
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

const mapStateToProps = state => {
    return {
        mentor: state.mentors[state.cur_mentor],
        isIdle: state.isIdle,
    }
}

export default connect(mapStateToProps)(Video);