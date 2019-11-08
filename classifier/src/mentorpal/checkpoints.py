import logging
import os

CHECKPOINT_ROOT_DEFAULT = "/app/checkpoint"
ARCH_DEFAULT = "lstm_v1"


def find_checkpoint(
    checkpoint_root: str = CHECKPOINT_ROOT_DEFAULT,
    arch: str = ARCH_DEFAULT,
    checkpoint: str = None,
) -> str:
    arch_root = os.path.abspath(os.path.join(checkpoint_root, arch))
    if not os.path.isdir(arch_root):
        logging.warning(f"find_checkpoint with non-existent root {arch_root}")
        return None
    if not checkpoint:
        all = sorted(
            [
                c
                for c in os.listdir(arch_root)
                if os.path.isdir(os.path.join(arch_root, c))
            ]
        )
        return os.path.join(arch_root, all[-1]) if len(all) >= 1 else None
    cp = os.path.join(arch_root, checkpoint)
    if not os.path.isdir(cp):
        logging.warning(f"find_checkpoint but checkpoint does not exist {cp}")
        return None
    return cp
