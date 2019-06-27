import React from 'react';
import ReactPlayer from 'react-player'
import { useSelector, useDispatch } from 'react-redux';
import { Star, StarBorder } from '@material-ui/icons'

import { idleUrl, videoUrl, subtitleUrl } from 'src/api/api'
import { answerFinished, faveMentor } from 'src/redux/actions'

const Video = ({ height }) => {
    return (
        <div id='video-container' style={{ width: height / 0.895 }}>
            <VideoPlayer width={height / 0.895} height={height} />
            <FaveButton />
        </div>
    )
}

const VideoPlayer = ({ width, height }) => {
    const dispatch = useDispatch()
    const isIdle = useSelector(state => state.isIdle)
    const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])
    const video_url = mentor ? (isIdle ? idleUrl(mentor) : videoUrl(mentor)) : ''
    const subtitle_url = mentor && !isIdle ? subtitleUrl(mentor) : ''

    const onEnded = () => {
        dispatch(answerFinished())
    }

    return (
        <ReactPlayer
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
                    tracks: [
                        { kind: 'subtitles', src: subtitle_url, srcLang: 'en', default: true },
                    ]
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
