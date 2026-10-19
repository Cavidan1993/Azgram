package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.model.Post
import com.example.data.repository.AzGramRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read app name from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("AzGram", appName)
  }

  @Test
  fun `repository initialization and post model validation`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val repo = AzGramRepository(context)
    assertNotNull(repo)

    val post = Post(
      id = "test-1",
      userId = "user-1",
      imageUrl = "https://example.com/img.jpg",
      caption = "Test caption",
      likesCount = 5,
      commentsCount = 2,
      authorUsername = "azerbaijan"
    )
    assertEquals("test-1", post.id)
    assertEquals(5, post.likesCount)
    assertEquals(2, post.commentsCount)
    assertEquals("azerbaijan", post.authorUsername)
  }
}
