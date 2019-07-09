import React from 'react'
import ReactPlayer from 'react-player'
import { useSelector, useDispatch } from 'react-redux';
import { Star, StarBorder } from '@material-ui/icons'

import { idleUrl, videoUrl, subtitleUrl } from 'src/api/api'
import { answerFinished, faveMentor } from 'src/redux/actions'
import { chromeVersion } from 'src/funcs/funcs'

const Video = ({ height, width }) => {
    const mobileWidth = height / 0.895
    const webWidth = height / 0.5625
    const format = Math.abs(width - mobileWidth) > Math.abs(width - webWidth) ? 'web' : 'mobile'
    width = Math.min(width, format === 'mobile' ? mobileWidth : webWidth)

    return (
        <div id='video-container' style={{ width: width }}>
            <VideoPlayer width={width} height={height} format={format} />
            <FaveButton />
        </div>
    )
}

const VideoPlayer = ({ width, height, format = 'mobile' }) => {
    const dispatch = useDispatch()
    const isIdle = useSelector(state => state.isIdle)
    const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
    const video_url = mentor ? (isIdle ? idleUrl(mentor, format) : videoUrl(mentor, format)) : ''
    const subtitle_url = mentor && !isIdle ? subtitleUrl(mentor) : ''
    const showSubtitles = !chromeVersion() || chromeVersion() >= 62

    const onEnded = () => {
        dispatch(answerFinished())
    }

    return (
        <ReactPlayer
            style={{ backgroundColor: 'black' }}
            url={video_url}
            onEnded={onEnded}
            loop={isIdle}
            width={width}
            height={height}
            controls={!isIdle}
            playing={true}
            playsinline={true}
            webkit-playsinline='true'
            config={{
                file: {
                    tracks: showSubtitles ? [{ kind: 'subtitles', src: subtitle_url, srcLang: 'en', default: true }] : []
                }
            }}
        />
    )
}

const FaveButton = () => {
    const dispatch = useDispatch()
    const mentor = useSelector(state => state.current_mentor)
    const faved_mentor = useSelector(state => state.faved_mentor)

    const onClick = () => {
        dispatch(faveMentor(mentor))
    }

    return (
        faved_mentor === mentor ?
            <Star className='star-icon' onClick={onClick} style={{ color: 'yellow' }} /> :
            <StarBorder className='star-icon' onClick={onClick} style={{ color: 'grey' }} />
    )
}

export default Video
